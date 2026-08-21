import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../services/api";
import socket from "../socket";
import { useAuth } from "../context/AuthContext";
import BookCard from "../components/BookCard";

// ======================================================
// BẢNG MÀU — đồng bộ với các trang quản trị (ink / rust / brass)
// ======================================================
const C = {
  ink: "#1C2B39",
  paper: "#FBF7EE",
  card: "#FFFFFF",
  line: "#E3DCC8",
  rust: "#A8493C",
  brass: "#B8872E",
  moss: "#4B6E58",
  muted: "#6B6357",
};

const DISPLAY_FONT = "'Fraunces', Georgia, serif";
const DATA_FONT = "'Space Grotesk', 'Courier New', monospace";

// Số thẻ thành viên kiểu "ký hiệu xếp giá thư viện" rút từ ObjectId
const buildMemberCode = (rawId) => {
  const value = String(rawId || "")
    .slice(-6)
    .toUpperCase();
  return value ? `SV·${value}` : "SV·------";
};

const SellerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [seller, setSeller] = useState(null);
  const [books, setBooks] = useState([]);

  const [reviewData, setReviewData] = useState({
    averageRating: 0,
    totalReviews: 0,
    reviews: [],
  });

  const [activeTab, setActiveTab] = useState("books");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isOnline, setIsOnline] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const currentUserId = String(user?._id || user?.id || user?.userId || "");
  const isSelf = currentUserId && currentUserId === String(id);

  // ======================================================
  // LẤY THÔNG TIN NGƯỜI BÁN
  // ======================================================
  useEffect(() => {
    const fetchSellerProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const [sellerResponse, booksResponse, reviewsResponse] =
          await Promise.all([
            api.get(`/api/users/${id}`),
            api.get(`/api/books/seller/${id}`),
            api.get(`/api/reviews/seller/${id}`),
          ]);

        const sellerData =
          sellerResponse.data.user ||
          sellerResponse.data.seller ||
          sellerResponse.data;

        const booksData = Array.isArray(booksResponse.data)
          ? booksResponse.data
          : booksResponse.data.books || [];

        const reviewsData = reviewsResponse.data || {};

        setSeller(sellerData);
        setBooks(booksData);

        setReviewData({
          averageRating: Number(reviewsData.averageRating || 0),
          totalReviews: Number(reviewsData.totalReviews || 0),
          reviews: Array.isArray(reviewsData.reviews)
            ? reviewsData.reviews
            : [],
        });
      } catch (requestError) {
        console.error("Lỗi lấy trang người bán:", requestError);

        setError(
          requestError.response?.data?.message ||
            "Không thể tải thông tin người bán.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSellerProfile();
    }
  }, [id]);

  // ======================================================
  // TRẠNG THÁI ONLINE THEO THỜI GIAN THỰC (SOCKET.IO)
  // ======================================================
  useEffect(() => {
    if (!id) {
      return undefined;
    }

    if (!socket.connected) {
      socket.connect();
    }

    const requestStatus = () => {
      socket.emit("get_online_status", id, (response) => {
        setIsOnline(Boolean(response?.isOnline));
      });
    };

    const handleStatusChanged = (payload) => {
      if (payload && String(payload.userId) === String(id)) {
        setIsOnline(Boolean(payload.isOnline));
      }
    };

    if (socket.connected) {
      requestStatus();
    }

    socket.on("connect", requestStatus);
    socket.on("user_status_changed", handleStatusChanged);

    return () => {
      socket.off("connect", requestStatus);
      socket.off("user_status_changed", handleStatusChanged);
    };
  }, [id]);

  // ======================================================
  // MỞ CUỘC TRÒ CHUYỆN VỚI NGƯỜI BÁN
  // ======================================================
  const handleStartChat = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (isSelf || chatLoading) {
      return;
    }

    if (books.length === 0) {
      alert("Người bán hiện chưa có sách nào để bắt đầu trò chuyện.");
      return;
    }

    try {
      setChatLoading(true);

      const response = await api.post("/api/conversations", {
        bookId: books[0]._id,
        sellerId: id,
      });

      const conversationId =
        response.data._id || response.data.conversation?._id;

      if (!conversationId) {
        throw new Error("Không nhận được ID cuộc trò chuyện");
      }

      navigate(`/chat/${conversationId}`);
    } catch (requestError) {
      console.error("Lỗi mở cuộc trò chuyện:", requestError);

      alert(
        requestError.response?.data?.message || "Không thể mở cuộc trò chuyện.",
      );
    } finally {
      setChatLoading(false);
    }
  };

  // ======================================================
  // HIỂN THỊ SAO
  // ======================================================
  const renderStars = (rating, size = "text-lg") => {
    const safeRating = Number(rating || 0);

    return (
      <div className={`flex items-center gap-0.5 ${size}`}>
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            style={{
              color: index < Math.round(safeRating) ? C.brass : C.line,
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const memberCode = useMemo(() => buildMemberCode(id), [id]);
  const averageRating = Number(reviewData.averageRating || 0);

  const joinedDate = seller?.createdAt
    ? new Date(seller.createdAt).toLocaleDateString("vi-VN")
    : "Chưa xác định";

  // ======================================================
  // LOADING
  // ======================================================
  if (loading) {
    return (
      <div className="min-h-screen py-10" style={{ backgroundColor: C.paper }}>
        <div className="max-w-5xl mx-auto px-4">
          <div
            className="rounded-2xl overflow-hidden animate-pulse border"
            style={{ backgroundColor: C.card, borderColor: C.line }}
          >
            <div className="h-3" style={{ backgroundColor: C.ink }} />

            <div className="p-8">
              <div
                className="w-28 h-28 rounded-full"
                style={{ backgroundColor: C.line }}
              />

              <div
                className="mt-6 h-7 rounded w-56"
                style={{ backgroundColor: C.line }}
              />

              <div
                className="mt-3 h-4 rounded w-40"
                style={{ backgroundColor: C.line }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ======================================================
  // LỖI
  // ======================================================
  if (error || !seller) {
    return (
      <div
        className="min-h-[70vh] flex items-center justify-center px-4"
        style={{ backgroundColor: C.paper }}
      >
        <div
          className="max-w-md w-full rounded-2xl shadow-sm p-8 text-center border"
          style={{ backgroundColor: C.card, borderColor: C.line }}
        >
          <div className="text-5xl mb-4">⚠️</div>

          <h2
            className="text-xl font-bold"
            style={{ color: C.ink, fontFamily: DISPLAY_FONT }}
          >
            Không thể tải trang người bán
          </h2>

          <p className="mt-2" style={{ color: C.muted }}>
            {error || "Không tìm thấy người bán."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: C.paper }}>
      <div className="max-w-5xl mx-auto px-4 pt-8">
        {/* ======================================================
            THẺ ĐỊNH DANH NGƯỜI BÁN
        ====================================================== */}
        <section
          className="relative rounded-2xl overflow-hidden shadow-sm border"
          style={{ backgroundColor: C.card, borderColor: C.line }}
        >
          {/* Dải tiêu đề kiểu thẻ thư viện */}
          <div
            className="flex items-center justify-between px-6 py-3"
            style={{ backgroundColor: C.ink }}
          >
            <span
              className="text-xs tracking-[0.2em] uppercase text-white/80"
              style={{ fontFamily: DATA_FONT }}
            >
              Thẻ người bán · Sách SV
            </span>

            <span
              className="text-xs tracking-[0.15em] text-white/60"
              style={{ fontFamily: DATA_FONT }}
            >
              {memberCode}
            </span>
          </div>

          {/* Dấu tem trạng thái hoạt động (bo góc, xoay nhẹ) */}
          <div
            className="absolute right-5 top-16 sm:top-14 select-none pointer-events-none"
            style={{ transform: "rotate(-8deg)" }}
          >
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2"
              style={{
                borderColor: isOnline ? C.moss : C.muted,
                color: isOnline ? C.moss : C.muted,
                backgroundColor: isOnline
                  ? "rgba(75, 110, 88, 0.06)"
                  : "rgba(107, 99, 87, 0.05)",
              }}
            >
              <span className="relative flex h-2 w-2">
                {isOnline && (
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                    style={{ backgroundColor: C.moss }}
                  />
                )}

                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: isOnline ? C.moss : C.muted }}
                />
              </span>

              <span
                className="text-[11px] font-bold tracking-wide uppercase"
                style={{ fontFamily: DATA_FONT }}
              >
                {isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
              </span>
            </div>
          </div>

          <div className="px-6 sm:px-8 pb-7 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              {/* Avatar */}
              <img
                src={
                  seller.avatar || "https://via.placeholder.com/160?text=Avatar"
                }
                alt={seller.fullName || "Người bán"}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 shadow-sm"
                style={{ borderColor: C.paper }}
              />

              <div className="flex-1 min-w-0">
                <h1
                  className="text-2xl sm:text-[28px] font-semibold leading-tight"
                  style={{ color: C.ink, fontFamily: DISPLAY_FONT }}
                >
                  {seller.fullName || "Người bán"}
                </h1>

                <p className="mt-1.5 text-sm" style={{ color: C.muted }}>
                  🎓 {seller.university || "Chưa cập nhật trường"}
                </p>

                <div className="flex items-center gap-2 mt-2.5">
                  {renderStars(averageRating)}

                  <span
                    className="font-bold"
                    style={{ color: C.ink, fontFamily: DATA_FONT }}
                  >
                    {averageRating.toFixed(1)}
                  </span>

                  <span className="text-sm" style={{ color: C.muted }}>
                    ({reviewData.totalReviews} đánh giá)
                  </span>
                </div>
              </div>
            </div>

            {/* Đường viền răng cưa kiểu vé xé */}
            <div
              className="mt-6 border-t border-dashed"
              style={{ borderColor: C.line }}
            />

            {/* Thống kê + hành động */}
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="flex gap-7">
                <div>
                  <p
                    className="text-xl font-bold"
                    style={{ color: C.ink, fontFamily: DATA_FONT }}
                  >
                    {books.length}
                  </p>

                  <p className="text-xs" style={{ color: C.muted }}>
                    Sách đang bán
                  </p>
                </div>

                <div>
                  <p
                    className="text-xl font-bold"
                    style={{ color: C.ink, fontFamily: DATA_FONT }}
                  >
                    {reviewData.totalReviews}
                  </p>

                  <p className="text-xs" style={{ color: C.muted }}>
                    Lượt đánh giá
                  </p>
                </div>

                <div>
                  <p
                    className="text-xl font-bold"
                    style={{ color: C.ink, fontFamily: DATA_FONT }}
                  >
                    {joinedDate}
                  </p>

                  <p className="text-xs" style={{ color: C.muted }}>
                    Thành viên từ
                  </p>
                </div>
              </div>

              {!isSelf && (
                <button
                  type="button"
                  onClick={handleStartChat}
                  disabled={chatLoading}
                  className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                  style={{ backgroundColor: C.rust }}
                >
                  {chatLoading ? "Đang mở..." : "💬 Nhắn tin ngay"}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ======================================================
            TAB
        ====================================================== */}
        <section className="mt-6">
          <div
            className="inline-flex rounded-lg p-1 gap-1 border"
            style={{ backgroundColor: C.card, borderColor: C.line }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("books")}
              className="py-2 px-4 rounded-md text-sm font-semibold transition-colors"
              style={
                activeTab === "books"
                  ? { backgroundColor: C.ink, color: "#fff" }
                  : { color: C.muted }
              }
            >
              📚 Sách đang bán ({books.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reviews")}
              className="py-2 px-4 rounded-md text-sm font-semibold transition-colors"
              style={
                activeTab === "reviews"
                  ? { backgroundColor: C.ink, color: "#fff" }
                  : { color: C.muted }
              }
            >
              ⭐ Đánh giá ({reviewData.totalReviews})
            </button>
          </div>
        </section>

        {/* ======================================================
            TAB SÁCH
        ====================================================== */}
        {activeTab === "books" && (
          <section className="mt-6">
            {books.length === 0 ? (
              <div
                className="rounded-2xl border p-12 text-center"
                style={{ backgroundColor: C.card, borderColor: C.line }}
              >
                <div className="text-5xl mb-4">📭</div>

                <h3
                  className="text-lg font-semibold"
                  style={{ color: C.ink, fontFamily: DISPLAY_FONT }}
                >
                  Chưa có sách đang bán
                </h3>

                <p className="mt-2 text-sm" style={{ color: C.muted }}>
                  Người bán hiện chưa đăng bán cuốn sách nào.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {books.map((book) => (
                  <BookCard key={book._id} book={book} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ======================================================
            TAB ĐÁNH GIÁ
        ====================================================== */}
        {activeTab === "reviews" && (
          <section className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tổng quan rating */}
              <div
                className="rounded-2xl border shadow-sm p-7 h-fit"
                style={{ backgroundColor: C.card, borderColor: C.line }}
              >
                <h2
                  className="text-lg font-semibold"
                  style={{ color: C.ink, fontFamily: DISPLAY_FONT }}
                >
                  Tổng quan đánh giá
                </h2>

                <div className="text-center mt-6">
                  <p
                    className="text-5xl font-bold"
                    style={{ color: C.rust, fontFamily: DATA_FONT }}
                  >
                    {averageRating.toFixed(1)}
                  </p>

                  <div className="flex justify-center mt-3">
                    {renderStars(averageRating, "text-2xl")}
                  </div>

                  <p className="mt-3 text-sm" style={{ color: C.muted }}>
                    Dựa trên {reviewData.totalReviews} lượt đánh giá
                  </p>
                </div>
              </div>

              {/* Danh sách đánh giá */}
              <div className="lg:col-span-2 space-y-4">
                {reviewData.reviews.length === 0 ? (
                  <div
                    className="rounded-2xl border p-12 text-center"
                    style={{ backgroundColor: C.card, borderColor: C.line }}
                  >
                    <div className="text-5xl mb-4">⭐</div>

                    <h3
                      className="text-lg font-semibold"
                      style={{ color: C.ink, fontFamily: DISPLAY_FONT }}
                    >
                      Chưa có đánh giá
                    </h3>

                    <p className="mt-2 text-sm" style={{ color: C.muted }}>
                      Người bán chưa nhận được đánh giá nào.
                    </p>
                  </div>
                ) : (
                  reviewData.reviews.map((review) => (
                    <article
                      key={review._id}
                      className="rounded-2xl border shadow-sm p-6"
                      style={{ backgroundColor: C.card, borderColor: C.line }}
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={
                            review.reviewerId?.avatar ||
                            "https://via.placeholder.com/60?text=User"
                          }
                          alt={review.reviewerId?.fullName || "Người đánh giá"}
                          className="w-11 h-11 rounded-full object-cover border"
                          style={{ borderColor: C.line }}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div>
                              <h3
                                className="font-semibold"
                                style={{ color: C.ink }}
                              >
                                {review.reviewerId?.fullName ||
                                  "Người dùng ẩn danh"}
                              </h3>

                              <p
                                className="text-xs mt-0.5"
                                style={{ color: C.muted }}
                              >
                                {review.reviewerId?.university ||
                                  "Chưa cập nhật trường"}
                              </p>
                            </div>

                            <span
                              className="text-xs"
                              style={{ color: C.muted }}
                            >
                              {review.createdAt
                                ? new Date(review.createdAt).toLocaleDateString(
                                    "vi-VN",
                                  )
                                : ""}
                            </span>
                          </div>

                          <div className="mt-2.5">
                            {renderStars(review.rating, "text-base")}
                          </div>

                          <p
                            className="mt-2.5 text-sm leading-relaxed"
                            style={{ color: "#3F3A32" }}
                          >
                            {review.comment ||
                              "Người dùng không để lại nhận xét."}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default SellerProfile;
