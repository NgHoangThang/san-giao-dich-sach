import React, { useCallback, useEffect, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import api from "../services/api";

const conditionMap = {
  new: "Mới 100%",
  "like-new": "Như mới",
  used: "Đã qua sử dụng",
};

const Wishlist = () => {
  const navigate = useNavigate();

  const [wishlist, setWishlist] = useState([]);

  const [loading, setLoading] = useState(true);

  const [removeLoading, setRemoveLoading] = useState("");

  const [error, setError] = useState("");

  const loadWishlist = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/wishlist");

      const data = Array.isArray(response.data)
        ? response.data
        : response.data.wishlist || [];

      setWishlist(data.filter((item) => item.bookId));
    } catch (requestError) {
      console.error("Lỗi lấy wishlist:", requestError);

      setError(
        requestError.response?.data?.message ||
          "Không thể tải danh sách yêu thích.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const handleRemove = async (bookId) => {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa sách này khỏi danh sách yêu thích không?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setRemoveLoading(bookId);

      const response = await api.delete(`/api/wishlist/${bookId}`);

      setWishlist((previousWishlist) =>
        previousWishlist.filter(
          (item) => String(item.bookId?._id) !== String(bookId),
        ),
      );

      alert(response.data.message || "Đã xóa khỏi danh sách yêu thích.");
    } catch (requestError) {
      console.error("Lỗi xóa wishlist:", requestError);

      alert(
        requestError.response?.data?.message ||
          "Không thể xóa sách khỏi danh sách yêu thích.",
      );
    } finally {
      setRemoveLoading("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#C92127] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Sách yêu thích
              </h1>

              <p className="text-sm text-gray-500 mt-1">
                Danh sách những cuốn sách bạn đã lưu.
              </p>
            </div>

            <button
              type="button"
              onClick={loadWishlist}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50"
            >
              Làm mới
            </button>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {wishlist.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-6xl mb-4">♡</div>

              <h2 className="text-lg font-bold text-gray-800">
                Chưa có sách yêu thích
              </h2>

              <p className="text-sm text-gray-500 mt-2">
                Hãy chọn những cuốn sách bạn quan tâm.
              </p>

              <Link
                to="/"
                className="inline-block mt-5 px-5 py-2.5 bg-[#C92127] text-white rounded-lg text-sm font-semibold hover:bg-red-700"
              >
                Khám phá sách
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {wishlist.map((item) => {
                const book = item.bookId;

                const removing = removeLoading === book._id;

                return (
                  <div
                    key={item._id}
                    className="border border-gray-200 rounded-xl p-4 flex gap-4"
                  >
                    <img
                      src={
                        book.images?.[0] ||
                        "https://via.placeholder.com/120x160?text=Sach"
                      }
                      alt={book.title}
                      className="w-24 h-32 object-cover rounded-lg border border-gray-200 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-gray-900 line-clamp-2">
                        {book.title}
                      </h2>

                      <p className="text-sm text-gray-500 mt-1">
                        Tác giả: {book.author || "Đang cập nhật"}
                      </p>

                      <p className="text-sm text-gray-500 mt-1">
                        Tình trạng:{" "}
                        {conditionMap[book.condition] ||
                          book.condition ||
                          "Đang cập nhật"}
                      </p>

                      <p className="text-lg font-bold text-[#C92127] mt-2">
                        {Number(book.price || 0).toLocaleString("vi-VN")}đ
                      </p>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/books/${book._id}`)}
                          className="px-4 py-2 bg-[#C92127] text-white rounded-lg text-sm font-semibold hover:bg-red-700"
                        >
                          Xem chi tiết
                        </button>

                        <button
                          type="button"
                          disabled={removing}
                          onClick={() => handleRemove(book._id)}
                          className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
                        >
                          {removing ? "Đang xóa..." : "Xóa"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;
