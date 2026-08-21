import React, { useEffect, useState } from "react";
import api from "../services/api";

const ReviewModal = ({ isOpen, order, onClose, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHoverRating(0);
      setComment("");
      setError("");
      setLoading(false);
    }
  }, [isOpen, order?._id]);

  if (!isOpen || !order) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    if (rating < 1 || rating > 5) {
      setError("Vui lòng chọn số sao từ 1 đến 5.");
      return;
    }

    if (comment.trim().length > 500) {
      setError("Nội dung đánh giá không được vượt quá 500 ký tự.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.post("/api/reviews/create", {
        orderId: order._id,
        rating,
        comment: comment.trim(),
      });

      alert(response.data?.message || "Đánh giá thành công!");

      if (onSuccess) {
        await onSuccess(response.data);
      }
    } catch (requestError) {
      console.error("Lỗi tạo đánh giá:", requestError);

      setError(
        requestError.response?.data?.details ||
          requestError.response?.data?.message ||
          "Không thể gửi đánh giá.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = () => {
    if (!loading) {
      onClose();
    }
  };

  const displayedRating = hoverRating || rating;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Đánh giá người bán
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Sách:{" "}
              <span className="font-medium text-gray-700">
                {order.bookId?.title || "Không xác định"}
              </span>
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mức độ hài lòng
            </label>

            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className={`text-4xl transition-transform hover:scale-110 ${
                    star <= displayedRating
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }`}
                  aria-label={`${star} sao`}
                >
                  ★
                </button>
              ))}
            </div>

            <p className="mt-2 text-sm text-gray-500">
              {rating === 0
                ? "Chưa chọn số sao"
                : `Bạn đã chọn ${rating}/5 sao`}
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nội dung đánh giá
            </label>

            <textarea
              rows={5}
              maxLength={500}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Chia sẻ trải nghiệm giao dịch với người bán..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none resize-none focus:ring-2 focus:ring-[#C92127] focus:border-[#C92127]"
            />

            <div className="text-right text-xs text-gray-400 mt-1">
              {comment.length}/500
            </div>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#C92127] text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
