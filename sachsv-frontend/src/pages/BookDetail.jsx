import React, { useEffect, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Toast from "../components/Toast";
import { getPlaceholderImage } from "../utils/placeholderImage";

const conditionMap = {
  new: "Mới 100%",
  "like-new": "Như mới (99%)",
  used: "Sách cũ / Đã qua sử dụng",
};

const BookDetail = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const { user } = useAuth();

  const [book, setBook] = useState(null);

  const [reviews, setReviews] = useState({
    averageRating: 0,
    totalReviews: 0,
    reviews: [],
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [selectedImage, setSelectedImage] = useState(0);

  const [orderLoading, setOrderLoading] = useState(false);

  const [chatLoading, setChatLoading] = useState(false);

  const [cartLoading, setCartLoading] = useState(false);

  const [cartToast, setCartToast] = useState(null);

  const [quantity, setQuantity] = useState(1);

  // ======================================================
  // ĐỊA CHỈ NHẬN HÀNG ĐÃ LƯU CỦA USER
  // ======================================================
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  // Wishlist
  const [isWishlisted, setIsWishlisted] = useState(false);

  const [wishlistLoading, setWishlistLoading] = useState(false);

  // ======================================================
  // LẤY THÔNG TIN SÁCH VÀ ĐÁNH GIÁ NGƯỜI BÁN
  // ======================================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const bookResponse = await api.get(`/api/books/${id}`);

        const bookData = bookResponse.data.book || bookResponse.data;

        setBook(bookData);

        const sellerId = bookData.sellerId?._id || bookData.sellerId;

        if (sellerId) {
          try {
            const reviewResponse = await api.get(
              `/api/reviews/seller/${sellerId}`,
            );

            if (reviewResponse.data.reviews) {
              setReviews(reviewResponse.data);
            } else {
              setReviews({
                averageRating: 0,
                totalReviews: 0,
                reviews: Array.isArray(reviewResponse.data)
                  ? reviewResponse.data
                  : [],
              });
            }
          } catch (reviewRequestError) {
            console.error("Không thể lấy đánh giá:", reviewRequestError);

            setReviews({
              averageRating: 0,
              totalReviews: 0,
              reviews: [],
            });
          }
        }
      } catch (requestError) {
        console.error("Lỗi lấy chi tiết sách:", requestError);

        setError(
          requestError.response?.data?.message || "Không tìm thấy sách này.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // ======================================================
  // KIỂM TRA SÁCH ĐÃ CÓ TRONG WISHLIST CHƯA
  // ======================================================
  useEffect(() => {
    const checkWishlist = async () => {
      if (!user || !id) {
        setIsWishlisted(false);
        return;
      }

      try {
        const response = await api.get("/api/wishlist");

        const wishlistData = Array.isArray(response.data)
          ? response.data
          : response.data.wishlist || [];

        const existed = wishlistData.some((item) => {
          const wishlistBookId = item.bookId?._id || item.bookId;

          return String(wishlistBookId) === String(id);
        });

        setIsWishlisted(existed);
      } catch (requestError) {
        console.error("Không thể kiểm tra wishlist:", requestError);

        setIsWishlisted(false);
      }
    };

    checkWishlist();
  }, [id, user]);

  // ======================================================
  // LẤY ĐỊA CHỈ ĐÃ LƯU CỦA USER
  // ======================================================
  const loadAddresses = async () => {
    try {
      setAddressLoading(true);

      const response = await api.get("/api/addresses");

      const addressData = Array.isArray(response.data)
        ? response.data
        : response.data.addresses || [];

      setAddresses(addressData);

      const defaultAddress =
        addressData.find((address) => address.isDefault) || addressData[0];

      setSelectedAddressId(defaultAddress?._id || "");

      return addressData;
    } catch (requestError) {
      console.error("Lỗi lấy địa chỉ nhận hàng:", requestError);

      setAddresses([]);
      setSelectedAddressId("");

      if (requestError.response?.status !== 403) {
        alert(
          requestError.response?.data?.message ||
            "Không thể tải danh sách địa chỉ nhận hàng.",
        );
      }

      return [];
    } finally {
      setAddressLoading(false);
    }
  };

  // ======================================================
  // MỞ FORM ĐẶT MUA ONLINE
  // ======================================================
  const handleOrder = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!["student", "user"].includes(user.role)) {
      alert("Chức năng đặt mua online chỉ dành cho người mua.");
      return;
    }

    if (book?.status !== "available") {
      alert("Sách này hiện không thể đặt mua.");
      return;
    }

    setShowOrderModal(true);

    await loadAddresses();
  };

  // ======================================================
  // XÁC NHẬN ĐẶT HÀNG
  // COPY ADDRESS ĐÃ CHỌN VÀO shippingAddress CỦA ORDER
  // ======================================================
  const handleSubmitOrder = async (event) => {
    event.preventDefault();

    if (orderLoading) {
      return;
    }

    const selectedAddress = addresses.find(
      (address) => String(address._id) === String(selectedAddressId),
    );

    if (!selectedAddress) {
      alert("Vui lòng chọn địa chỉ nhận hàng.");
      return;
    }

    const { receiverName, phoneNumber, addressLine, ward, province, note } =
      selectedAddress;

    if (
      !receiverName?.trim() ||
      !phoneNumber?.trim() ||
      !addressLine?.trim() ||
      !ward?.trim() ||
      !province?.trim()
    ) {
      alert(
        "Địa chỉ đã chọn đang thiếu thông tin. Vui lòng cập nhật lại trong Hồ sơ cá nhân.",
      );
      return;
    }

    try {
      setOrderLoading(true);

      const response = await api.post("/api/orders/create", {
        // ĐÃ SỬA: backend đổi sang nhận items[] (dùng chung cho cả
        // "Thanh toán giỏ hàng" và "Mua ngay") nhưng trang này vẫn gửi
        // bookId/quantity ở cấp cao nhất -> Joi trả lỗi "Thiếu danh
        // sách sách trong đơn hàng". Bọc lại thành mảng 1 item.
        items: [{ bookId: id, quantity }],

        // Lưu snapshot địa chỉ vào Order.
        // Sau này User sửa/xóa Address thì đơn hàng cũ vẫn giữ nguyên.
        shippingAddress: {
          receiverName: receiverName.trim(),
          phoneNumber: phoneNumber.trim(),
          addressLine: addressLine.trim(),
          ward: ward.trim(),
          province: province.trim(),
          note: note?.trim() || "",
        },
      });

      alert(
        response.data.message || "Đặt mua thành công! Đang chờ Admin xác nhận.",
      );

      setShowOrderModal(false);

      navigate("/orders");
    } catch (requestError) {
      console.error("Lỗi đặt mua:", requestError);

      alert(
        requestError.response?.data?.details ||
          requestError.response?.data?.message ||
          "Đặt mua thất bại.",
      );
    } finally {
      setOrderLoading(false);
    }
  };

  // ======================================================
  // THÊM VÀO GIỎ HÀNG
  // ======================================================
  const handleAddToCart = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!["student", "user"].includes(user.role)) {
      alert("Chức năng giỏ hàng chỉ dành cho người mua.");
      return;
    }

    if (book?.status !== "available") {
      alert("Sách này hiện không thể thêm vào giỏ hàng.");
      return;
    }

    if (cartLoading) {
      return;
    }

    try {
      setCartLoading(true);

      const response = await api.post("/api/cart", {
        bookId: id,
        quantity,
      });

      setCartToast({
        message: response.data.message || "Đã thêm vào giỏ hàng!",
        type: "success",
      });

      // Báo cho Navbar cập nhật lại số trên icon giỏ hàng ngay, không
      // cần F5. Dùng CustomEvent thay vì Context để không phải bọc
      // thêm 1 lớp Provider mới chỉ cho mỗi việc này.
      window.dispatchEvent(new Event("cart:updated"));
    } catch (requestError) {
      console.error("Lỗi thêm vào giỏ hàng:", requestError);

      setCartToast({
        message:
          requestError.response?.data?.details ||
          requestError.response?.data?.message ||
          "Không thể thêm vào giỏ hàng.",
        type: "error",
      });
    } finally {
      setCartLoading(false);
    }
  };

  // ======================================================
  // MUA TRỰC TIẾP TẠI CỬA HÀNG
  // ======================================================
  const handleDirectPurchase = () => {
    if (book?.status !== "available") {
      alert("Sách này hiện không thể mua.");
      return;
    }

    navigate("/shop");
  };

  // ======================================================
  // MỞ CUỘC TRÒ CHUYỆN VỚI NGƯỜI BÁN
  // ======================================================
  const handleChat = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    const sellerId = book?.sellerId?._id || book?.sellerId;

    if (!sellerId) {
      alert("Không tìm thấy thông tin người bán.");
      return;
    }

    if (chatLoading) {
      return;
    }

    try {
      setChatLoading(true);

      const response = await api.post("/api/conversations", {
        bookId: id,
        sellerId,
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
  // THÊM HOẶC XÓA KHỎI WISHLIST
  // ======================================================
  const handleToggleWishlist = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (wishlistLoading) {
      return;
    }

    try {
      setWishlistLoading(true);

      if (isWishlisted) {
        const response = await api.delete(`/api/wishlist/${id}`);

        setIsWishlisted(false);

        alert(response.data.message || "Đã xóa khỏi danh sách yêu thích.");
      } else {
        const response = await api.post("/api/wishlist", {
          bookId: id,
        });

        setIsWishlisted(true);

        alert(response.data.message || "Đã thêm vào danh sách yêu thích.");
      }
    } catch (requestError) {
      console.error("Lỗi cập nhật wishlist:", requestError);

      // Trường hợp Backend báo sách đã có
      if (
        requestError.response?.status === 400 &&
        requestError.response?.data?.message?.toLowerCase().includes("đã có")
      ) {
        setIsWishlisted(true);
      }

      alert(
        requestError.response?.data?.message ||
          "Không thể cập nhật danh sách yêu thích.",
      );
    } finally {
      setWishlistLoading(false);
    }
  };

  // ======================================================
  // TRẠNG THÁI ĐANG TẢI
  // ======================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C92127]" />
      </div>
    );
  }
  // ======================================================
  // TỐ CÁO SÁCH
  // ======================================================
  const handleReportBook = async () => {
    if (!user) {
      alert("Bạn cần đăng nhập để tố cáo.");
      navigate("/login");
      return;
    }

    const reason = window.prompt("Nhập lý do tố cáo:");

    if (!reason?.trim()) {
      return;
    }

    const description = window.prompt("Mô tả chi tiết nội dung vi phạm:");

    if (!description?.trim()) {
      alert("Vui lòng nhập nội dung mô tả chi tiết.");
      return;
    }

    try {
      const response = await api.post("/api/reports", {
        targetId: id,
        targetType: "book",
        reason: reason.trim(),
        description: description.trim(),
      });

      alert(response.data?.message || "Đã gửi tố cáo thành công.");
    } catch (requestError) {
      console.error("Lỗi gửi tố cáo:", requestError);

      alert(requestError.response?.data?.message || "Không thể gửi tố cáo.");
    }
  };

  // ======================================================
  // KHÔNG TÌM THẤY SÁCH
  // ======================================================
  if (error || !book) {
    return (
      <div className="min-h-screen bg-[#F0F0F0] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600 font-medium">
          {error || "Sách không tồn tại"}
        </p>

        <Link
          to="/"
          className="px-5 py-2 bg-[#C92127] text-white rounded-lg text-sm"
        >
          Về trang chủ
        </Link>
      </div>
    );
  }

  const seller = book.sellerId;

  const currentUserId = user?._id || user?.id || user?.userId;

  const sellerUserId = seller?._id || seller;

  const isOwner =
    currentUserId &&
    sellerUserId &&
    String(currentUserId) === String(sellerUserId);

  const isHidden = book.status === "hidden";

  const bookImages =
    Array.isArray(book.images) && book.images.length > 0 ? book.images : [];

  return (
    <div className="min-h-screen bg-[#F0F0F0] py-6 font-sans">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm text-gray-500 flex items-center gap-2">
          <Link to="/" className="hover:text-[#C92127]">
            Trang chủ
          </Link>

          <span>›</span>

          <span className="hover:text-[#C92127] cursor-pointer">
            {book.category || "Danh mục"}
          </span>

          <span>›</span>

          <span className="text-gray-800 truncate">{book.title}</span>
        </nav>

        {/* Khối thông tin chính */}
        <div className="bg-white rounded-lg shadow-sm p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Cột trái */}
          <div className="md:col-span-5 flex flex-col">
            {/* Ảnh chính */}
            <div className="w-full flex justify-center mb-4 border border-gray-100 rounded-lg p-2">
              <img
                src={
                  bookImages[selectedImage] ||
                  getPlaceholderImage(400, 500, "Chưa có ảnh")
                }
                alt={book.title || "Ảnh sách"}
                className="max-h-[400px] object-contain"
              />
            </div>

            {/* Danh sách ảnh phụ */}
            {bookImages.length > 0 && (
              <div className="flex gap-2 justify-center mb-6 overflow-x-auto">
                {bookImages.map((image, index) => (
                  <button
                    type="button"
                    key={`${image}-${index}`}
                    onClick={() => setSelectedImage(index)}
                    className={`w-16 h-16 shrink-0 border rounded ${
                      selectedImage === index
                        ? "border-[#C92127] border-2"
                        : "border-gray-200"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Ảnh sách ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Nút hành động */}
            {!isOwner && !isHidden && (
              <div className="w-full mt-auto space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Wishlist */}
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    disabled={wishlistLoading}
                    className={`py-3 border-2 font-semibold rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                      isWishlisted
                        ? "border-[#C92127] bg-red-50 text-[#C92127]"
                        : "border-gray-300 text-gray-700 hover:border-[#C92127] hover:text-[#C92127] hover:bg-red-50/40"
                    }`}
                  >
                    <span className="text-xl">{isWishlisted ? "♥" : "♡"}</span>

                    {wishlistLoading
                      ? "Đang xử lý..."
                      : isWishlisted
                        ? "Đã yêu thích"
                        : "Yêu thích"}
                  </button>

                  {/* Chat */}
                  <button
                    type="button"
                    onClick={handleChat}
                    disabled={chatLoading}
                    className="py-3 border-2 border-[#C92127] text-[#C92127] font-semibold rounded-xl hover:bg-red-50 transition-all flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>

                    {chatLoading ? "Đang mở..." : "Nhắn tin"}
                  </button>

                  {/* Tố cáo */}
                  <button
                    type="button"
                    onClick={handleReportBook}
                    className="py-3 border-2 border-orange-400 text-orange-600 font-semibold rounded-xl hover:bg-orange-50 transition-all"
                  >
                    🚩 Tố cáo
                  </button>
                </div>

                {/* Thêm vào giỏ hàng */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={cartLoading || book.status !== "available"}
                  className="w-full py-3.5 border-2 border-[#C92127] text-[#C92127] font-bold rounded-xl hover:bg-red-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  🛒{" "}
                  {cartLoading ? "Đang thêm..." : "Thêm vào giỏ hàng"}
                </button>

                {/* Hai hình thức mua */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleOrder}
                    disabled={orderLoading || book.status !== "available"}
                    className="py-3.5 bg-[#C92127] text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {book.status === "sold"
                      ? "Đã bán"
                      : book.status !== "available"
                        ? "Không thể mua"
                        : "🛒 Đặt mua online"}
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectPurchase}
                    disabled={book.status !== "available"}
                    className="py-3.5 border-2 border-[#B8872E] bg-[#FFF9ED] text-[#8A6818] font-bold rounded-xl hover:bg-[#F6ECD6] transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    🏪 Mua trực tiếp tại cửa hàng
                  </button>
                </div>
              </div>
            )}

            {/* Chủ sách */}
            {isOwner && (
              <div className="mt-4 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                Đây là sách do bạn đăng bán.
              </div>
            )}

            {/* Sách bị ẩn */}
            {isHidden && (
              <div className="mt-4 px-4 py-3 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                Sách này hiện đang tạm ẩn.
              </div>
            )}

            {/* Chính sách */}
            <div className="mt-6 border-t pt-4">
              <h4 className="font-semibold text-gray-800 mb-2">
                Chính sách giao dịch của Sách SV
              </h4>

              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex gap-2 items-center">
                  <span className="text-[#C92127]">🚚</span>
                  Đặt mua online và giao hàng đến địa chỉ của bạn
                </li>

                <li className="flex gap-2 items-center">
                  <span className="text-[#B8872E]">🏪</span>
                  Có thể đến mua trực tiếp tại cửa hàng Sách SV
                </li>

                <li className="flex gap-2 items-center">
                  <span className="text-[#C92127]">🔄</span>
                  Kiểm tra sách trước khi thanh toán
                </li>

                <li className="flex gap-2 items-center">
                  <span className="text-[#C92127]">🛡️</span>
                  Thông tin sinh viên minh bạch
                </li>
              </ul>
            </div>
          </div>

          {/* Cột phải */}
          <div className="md:col-span-7">
            <h1 className="text-2xl font-medium text-gray-900 mb-2 leading-snug">
              {book.title}
            </h1>

            {/* Thông tin cơ bản */}
            <div>
              <span className="text-gray-500">Người bán: </span>

              {sellerUserId ? (
                <Link
                  to={`/seller/${sellerUserId}`}
                  className="text-[#2489F4] font-medium hover:text-[#C92127] hover:underline"
                >
                  {seller?.fullName || "Sinh viên ẩn danh"}
                </Link>
              ) : (
                <span className="text-gray-500 font-medium">
                  Sinh viên ẩn danh
                </span>
              )}
            </div>

            {/* Đánh giá */}
            {/* Đánh giá người bán */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="flex text-[#F5A623]">★★★★★</div>

                <span>
                  Đánh giá người bán: {reviews.averageRating || 0}
                  /5 ({reviews.totalReviews || 0} lượt)
                </span>
              </div>

              {sellerUserId && (
                <Link
                  to={`/seller/${sellerUserId}`}
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 border border-[#2489F4] text-[#2489F4] font-medium rounded-lg hover:bg-blue-50 transition-colors"
                >
                  👤 Xem trang người bán
                </Link>
              )}
            </div>

            {/* Giá */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex items-end gap-3 flex-wrap">
                <span className="text-3xl font-bold text-[#C92127]">
                  {Number(book.price || 0).toLocaleString("vi-VN")}đ
                </span>

                {Number(book.originalPrice) > Number(book.price) && (
                  <>
                    <span className="text-gray-400 line-through text-base">
                      {Number(book.originalPrice).toLocaleString("vi-VN")}đ
                    </span>

                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                      -
                      {Math.round(
                        (1 - Number(book.price) / Number(book.originalPrice)) *
                          100,
                      )}
                      %
                    </span>
                  </>
                )}
              </div>

              {isHidden && (
                <div className="mt-2 inline-block px-3 py-1 bg-gray-200 text-gray-600 text-sm font-semibold rounded">
                  Sách đang tạm ẩn
                </div>
              )}
            </div>

            {/* Thông tin giao dịch */}
            <div className="mb-6 text-sm">
              <div className="font-semibold mb-2">Thông tin giao dịch</div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <span>🚚</span>

                  <span>
                    Đặt mua online để hệ thống giao sách đến địa chỉ nhận hàng
                    của bạn.
                  </span>
                </div>

                <div className="flex gap-2">
                  <span>🏪</span>

                  <span>
                    Hoặc đến trực tiếp cửa hàng Sách SV để xem và mua sách.
                  </span>
                </div>
              </div>
            </div>

            {/* Số lượng */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-semibold text-gray-700">
                Số lượng:
              </span>

              <div className="flex items-center border border-gray-300 rounded">
                <button
                  type="button"
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  −
                </button>

                <input
                  type="text"
                  value={quantity}
                  readOnly
                  className="w-12 text-center text-sm font-medium border-x border-gray-300 py-1 focus:outline-none"
                />

                <button
                  type="button"
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={quantity >= (book?.quantity ?? 1)}
                  onClick={() =>
                    setQuantity((previousQuantity) =>
                      Math.min(book?.quantity ?? 1, previousQuantity + 1),
                    )
                  }
                >
                  +
                </button>
              </div>

              <span className="text-xs text-gray-500">
                {book?.quantity > 0
                  ? `Còn lại ${book.quantity} cuốn`
                  : "Đã hết hàng"}
              </span>
            </div>
          </div>
        </div>

        {/* Thông tin chi tiết */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 uppercase">
            Thông tin chi tiết
          </h2>

          <table className="w-full text-sm text-gray-700 border-collapse">
            <tbody>
              {[
                {
                  label: "Tên sách",
                  value: book.title,
                },
                {
                  label: "Tác giả",
                  value: book.author,
                },
                {
                  label: "Nhà xuất bản",
                  value: book.publisher,
                },
                {
                  label: "Năm xuất bản",
                  value: book.year,
                },
                {
                  label: "Số trang",
                  value: book.pages,
                },
                {
                  label: "Trọng lượng",
                  value: book.weight ? `${book.weight} gr` : null,
                },
                {
                  label: "Mã ISBN",
                  value: book.isbn,
                },
                {
                  label: "Danh mục",
                  value: book.category,
                },
                {
                  label: "Tình trạng",
                  value: conditionMap[book.condition] || book.condition,
                },
                {
                  label: "Người bán",
                  value: seller?.fullName,
                },
                {
                  label: "Trường ĐH",
                  value: seller?.university,
                },
                {
                  label: "Ngày đăng bán",
                  value: book.createdAt
                    ? new Date(book.createdAt).toLocaleDateString("vi-VN")
                    : null,
                },
              ]
                .filter(
                  (row) =>
                    row.value !== undefined &&
                    row.value !== null &&
                    row.value !== "",
                )
                .map((row, index) => (
                  <tr
                    key={`${row.label}-${index}`}
                    className="border-b border-gray-100"
                  >
                    <td className="py-3 px-4 w-1/3 bg-gray-50 text-gray-500 font-medium text-sm">
                      {row.label}
                    </td>

                    <td className="py-3 px-4 text-sm text-gray-800">
                      {row.value}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Mô tả sản phẩm */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6 mb-12">
          <h2 className="text-lg font-bold text-gray-800 mb-4 uppercase">
            Mô tả sản phẩm
          </h2>

          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {book.description ||
              "Người bán chưa cung cấp mô tả chi tiết cho cuốn sách này. Vui lòng nhắn tin trực tiếp để hỏi thêm thông tin."}
          </div>
        </div>
      </div>

      {/* ==================================================
          POPUP CHỌN ĐỊA CHỈ NHẬN HÀNG
      ================================================== */}
      {showOrderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#C92127]">
                  Đặt mua online
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  Chọn địa chỉ nhận hàng
                </h2>
              </div>

              <button
                type="button"
                disabled={orderLoading}
                onClick={() => setShowOrderModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* THÔNG TIN SÁCH */}
            <div className="mx-6 mt-5 flex gap-4 rounded-xl bg-gray-50 p-4">
              <img
                src={
                  bookImages[0] ||
                  getPlaceholderImage(80, 100, "Sách")
                }
                alt={book.title}
                className="h-24 w-16 rounded-lg border object-cover"
              />

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 line-clamp-2">
                  {book.title}
                </p>

                <p className="mt-2 text-xl font-bold text-[#C92127]">
                  {Number((book.price || 0) * quantity).toLocaleString("vi-VN")}
                  đ
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {Number(book.price || 0).toLocaleString("vi-VN")}đ ×{" "}
                  {quantity} cuốn
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitOrder} className="p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Địa chỉ nhận hàng</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Chọn một địa chỉ bạn đã lưu trong hồ sơ.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowOrderModal(false);
                    navigate("/profile");
                  }}
                  className="shrink-0 rounded-lg border border-[#C92127] px-3.5 py-2 text-sm font-semibold text-[#C92127] transition hover:bg-red-50"
                >
                  + Quản lý địa chỉ
                </button>
              </div>

              {/* LOADING ADDRESS */}
              {addressLoading ? (
                <div className="flex items-center justify-center rounded-xl border border-gray-200 py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C92127] border-t-transparent" />
                </div>
              ) : addresses.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-5 py-10 text-center">
                  <div className="text-4xl">📍</div>

                  <p className="mt-3 font-bold text-gray-900">
                    Bạn chưa có địa chỉ nhận hàng
                  </p>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                    Hãy thêm địa chỉ trong Hồ sơ cá nhân trước khi đặt mua
                    online.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setShowOrderModal(false);
                      navigate("/profile");
                    }}
                    className="mt-5 rounded-xl bg-[#C92127] px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                  >
                    + Thêm địa chỉ nhận hàng
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => {
                    const isSelected =
                      String(selectedAddressId) === String(address._id);

                    const fullAddress = [
                      address.addressLine,
                      address.ward,
                      address.province,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <button
                        type="button"
                        key={address._id}
                        onClick={() => setSelectedAddressId(address._id)}
                        className={`w-full rounded-2xl border-2 p-4 text-left transition ${
                          isSelected
                            ? "border-[#C92127] bg-red-50/50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              isSelected
                                ? "border-[#C92127]"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <div className="h-2.5 w-2.5 rounded-full bg-[#C92127]" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-gray-900">
                                📍 {address.label || "Địa chỉ"}
                              </span>

                              {address.isDefault && (
                                <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-[#C92127]">
                                  Mặc định
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-sm font-semibold text-gray-800">
                              {address.receiverName}
                              <span className="mx-2 font-normal text-gray-300">
                                |
                              </span>
                              <span className="font-normal text-gray-600">
                                {address.phoneNumber}
                              </span>
                            </p>

                            <p className="mt-1.5 text-sm leading-6 text-gray-600">
                              {fullAddress}
                            </p>

                            {address.note && (
                              <p className="mt-1 text-xs text-gray-500">
                                Ghi chú: {address.note}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* GHI CHÚ SNAPSHOT */}
              {addresses.length > 0 && selectedAddressId && !addressLoading && (
                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-bold uppercase text-blue-600">
                    ℹ️ Lưu ý
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Địa chỉ đã chọn sẽ được lưu vào đơn hàng. Sau này bạn sửa
                    hoặc xóa địa chỉ trong hồ sơ thì đơn hàng cũ vẫn giữ nguyên
                    địa chỉ lúc đặt.
                  </p>
                </div>
              )}

              {/* BUTTON */}
              <div className="mt-6 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={orderLoading}
                  onClick={() => setShowOrderModal(false)}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={
                    orderLoading ||
                    addressLoading ||
                    addresses.length === 0 ||
                    !selectedAddressId
                  }
                  className="rounded-xl bg-[#C92127] px-6 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {orderLoading
                    ? "Đang đặt hàng..."
                    : `Xác nhận đặt hàng • ${Number(
                        (book.price || 0) * quantity,
                      ).toLocaleString("vi-VN")}đ`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast
        message={cartToast?.message}
        type={cartToast?.type}
        onClose={() => setCartToast(null)}
      />
    </div>
  );
};

export default BookDetail;
