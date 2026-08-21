import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const API_ORIGIN = (
  process.env.REACT_APP_API_URL || "http://localhost:5000"
).replace(/\/api\/?$/, "");

// ======================================================
// BẢNG MÀU THEO THƯƠNG HIỆU SÁCH SV (đỏ nâu chủ đạo)
// ======================================================
const PALETTE = {
  primary: "#9A2F27",
  primaryDark: "#7A241D",
  gold: "#C98A2C",
  ink: "#1F2A37",
  cream: "#FBF7F0",
  line: "#EAE3D5",
  muted: "#6B7280",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  white: "#FFFFFF",
};

const CATEGORY_STYLES = {
  "Công nghệ thông tin": { color: "#1F2A37", label: "CNTT" },
  "Kinh tế": { color: "#B8872E", label: "Kinh tế" },
  "Ngoại ngữ": { color: "#2F6F76", label: "Ngoại ngữ" },
  "Y Dược": { color: "#9A2F27", label: "Y Dược" },
  "Văn học": { color: "#5C4470", label: "Văn học" },
  "Kỹ năng sống": { color: "#237A57", label: "Kỹ năng sống" },
  "Giáo trình đại cương": { color: "#7A241D", label: "Giáo trình" },
  "Khoa học - Kỹ thuật": { color: "#3B5BA9", label: "KH - Kỹ thuật" },
  Luật: { color: "#4B4453", label: "Luật" },
  "Thiếu nhi - Truyện tranh": { color: "#D97706", label: "Thiếu nhi" },
};

const CONDITION_LABELS = {
  new: "Mới",
  "like-new": "Như mới",
  used: "Đã dùng",
};

const STATUS_LABELS = {
  available: "Còn hàng",
  sold: "Đã bán",
  hidden: "Đã ẩn",
};

const FONT_SERIF = "'Fraunces', serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

const resolveImageUrl = (image) => {
  if (!image) return "";

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  if (image.startsWith("/")) {
    return `${API_ORIGIN}${image}`;
  }

  return `${API_ORIGIN}/${image}`;
};

const formatPrice = (price) =>
  `${Number(price || 0).toLocaleString("vi-VN")} đ`;

const isNewBook = (book) => {
  if (!book?.createdAt) return false;

  const createdAt = new Date(book.createdAt);

  if (Number.isNaN(createdAt.getTime())) return false;

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - createdAt.getTime() <= sevenDays;
};

const getSellerName = (book) => {
  if (book?.sellerId && typeof book.sellerId === "object") {
    return book.sellerId.fullName || book.sellerId.name || "Người bán";
  }

  return "";
};

const BookCard = ({ book }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [imageFailed, setImageFailed] = useState(false);

  // GHI CHÚ: chưa xác nhận được field cho biết sách đã nằm trong wishlist
  // hay chưa (chưa có source Wishlist.jsx / WishlistContext). Tạm đọc từ
  // book?.isWishlisted nếu backend đã trả sẵn, mặc định false nếu không có.
  // Việc thêm/xoá wishlist vẫn gọi đúng API thật, chỉ trạng thái ban đầu
  // của trái tim có thể cần chỉnh lại khi có thêm thông tin.
  const [isWishlisted, setIsWishlisted] = useState(Boolean(book?.isWishlisted));
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const categoryStyle = CATEGORY_STYLES[book?.category] || {
    color: "#64748B",
    label: book?.category || "Khác",
  };

  const conditionLabel =
    CONDITION_LABELS[book?.condition] || book?.condition || "Chưa cập nhật";

  const statusLabel = STATUS_LABELS[book?.status] || book?.status || "Còn hàng";
  const isSold = book?.status === "sold";

  const imageUrl = resolveImageUrl(book?.images?.[0]);
  const sellerName = getSellerName(book);
  const newBook = isNewBook(book);

  const handleToggleWishlist = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      navigate("/login");
      return;
    }

    if (wishlistLoading || !book?._id) return;

    const nextValue = !isWishlisted;

    setWishlistLoading(true);
    setIsWishlisted(nextValue);

    try {
      if (nextValue) {
        await api.post("/api/wishlist", { bookId: book._id });
      } else {
        await api.delete(`/api/wishlist/${book._id}`);
      }
    } catch (wishlistError) {
      console.error("Lỗi cập nhật wishlist:", wishlistError);

      // Hoàn tác nếu gọi API thất bại
      setIsWishlisted(!nextValue);

      alert(
        wishlistError.response?.data?.message ||
          "Không thể cập nhật danh sách yêu thích. Vui lòng thử lại.",
      );
    } finally {
      setWishlistLoading(false);
    }
  };

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_4px_18px_rgba(31,42,55,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(31,42,55,0.14)] ${
        isSold ? "opacity-70" : ""
      }`}
      style={{
        borderColor: PALETTE.line,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <Link
        to={`/books/${book?._id}`}
        className="relative block h-56 overflow-hidden bg-slate-100"
      >
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt={book?.title || "Sách"}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-5xl">📚</span>

            <span
              className="px-6 text-xs font-semibold"
              style={{ color: PALETTE.muted }}
            >
              Chưa có ảnh bìa
            </span>
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {newBook && !isSold && (
            <span
              className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow"
              style={{ backgroundColor: PALETTE.success }}
            >
              Mới đăng
            </span>
          )}

          {book?.status && (
            <span
              className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow"
              style={{
                backgroundColor:
                  book.status === "sold"
                    ? PALETTE.danger
                    : book.status === "hidden"
                      ? PALETTE.muted
                      : PALETTE.success,
              }}
            >
              {statusLabel}
            </span>
          )}
        </div>

        {/* Nút Wishlist - gọi API thật POST/DELETE /api/wishlist */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          disabled={wishlistLoading}
          aria-label={isWishlisted ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md transition hover:scale-105 disabled:opacity-60"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={isWishlisted ? PALETTE.primary : "none"}
            stroke={isWishlisted ? PALETTE.primary : PALETTE.muted}
            strokeWidth="2"
          >
            <path d="M12 21s-6.7-4.35-9.3-8.1C1 10.2 1.6 6.9 4.4 5.3c2.3-1.3 4.9-.6 6.4 1.3l1.2 1.5 1.2-1.5c1.5-1.9 4.1-2.6 6.4-1.3 2.8 1.6 3.4 4.9 1.7 7.6C18.7 16.65 12 21 12 21z" />
          </svg>
        </button>

        <div className="absolute bottom-3 left-3">
          <span
            className="rounded-md border bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
            style={{
              color: categoryStyle.color,
              borderColor: PALETTE.line,
              fontFamily: FONT_MONO,
            }}
          >
            {categoryStyle.label}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{
              color: PALETTE.muted,
              backgroundColor: PALETTE.cream,
              fontFamily: FONT_MONO,
            }}
          >
            {conditionLabel}
          </span>

          {book?.createdAt && (
            <span
              className="text-[10px] font-semibold"
              style={{ color: PALETTE.muted }}
            >
              {new Date(book.createdAt).toLocaleDateString("vi-VN")}
            </span>
          )}
        </div>

        <Link to={`/books/${book?._id}`}>
          <h3
            className="mt-2.5 line-clamp-2 min-h-[46px] text-[15px] font-bold leading-6 transition group-hover:text-[#9A2F27]"
            style={{ color: PALETTE.ink }}
          >
            {book?.title || "Sách chưa có tiêu đề"}
          </h3>
        </Link>

        <p
          className="mt-1.5 line-clamp-1 text-xs"
          style={{ color: PALETTE.muted }}
        >
          {book?.author || "Chưa rõ tác giả"}
        </p>

        {sellerName && (
          <p
            className="mt-0.5 line-clamp-1 text-xs"
            style={{ color: PALETTE.muted }}
          >
            Người bán: <span className="font-semibold">{sellerName}</span>
          </p>
        )}

        <div className="mt-auto pt-3">
          <p
            className="text-lg font-extrabold"
            style={{ color: PALETTE.primary }}
          >
            {formatPrice(book?.price)}
          </p>

          <Link
            to={`/books/${book?._id}`}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white shadow-sm transition duration-200 hover:brightness-110"
            style={{
              backgroundColor: isSold ? PALETTE.muted : PALETTE.primary,
            }}
          >
            {isSold ? "Đã bán" : "Xem chi tiết"}
          </Link>
        </div>
      </div>
    </article>
  );
};

export default BookCard;
