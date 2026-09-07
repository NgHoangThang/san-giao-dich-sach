import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { getPlaceholderImage } from "../utils/placeholderImage";

const MyBooks = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyBooks();
  }, []);

  const fetchMyBooks = async () => {
    try {
      const res = await api.get("/api/books/my-books");
      const booksData = Array.isArray(res.data.data) ? res.data.data : [];
      setBooks(booksData);
    } catch (err) {
      console.error(err);
      alert("Không thể tải danh sách sách!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa cuốn sách này không?"))
      return;
    try {
      await api.delete(`/api/books/${id}`);
      alert("Xóa sách thành công!");
      fetchMyBooks();
    } catch (err) {
      alert("Lỗi khi xóa sách!");
    }
  };

  if (loading)
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          📦 Quản Lý Kho Sách
        </h2>
        <Link
          to="/create-book"
          className="bg-[#C92127] text-white px-4 py-2 rounded hover:bg-red-700"
        >
          + Đăng sách mới
        </Link>
      </div>

      {books.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow-sm border">
          <p className="text-gray-500 mb-4">Bạn chưa đăng bán cuốn sách nào.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-sm uppercase">
                <th className="p-4 border-b">Tên sách</th>
                <th className="p-4 border-b">Giá</th>
                <th className="p-4 border-b">Trạng thái</th>
                <th className="p-4 border-b text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr
                  key={book._id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="p-4 border-b flex items-center gap-3">
                    <img
                      src={
                        book.images && book.images[0]
                          ? book.images[0]
                          : getPlaceholderImage(50, 50, "Sách")
                      }
                      alt={book.title}
                      className="w-12 h-16 object-cover rounded border"
                    />
                    <div>
                      <p className="font-semibold text-gray-800 line-clamp-1">
                        {book.title}
                      </p>
                      <p className="text-xs text-gray-500">{book.category}</p>
                    </div>
                  </td>
                  <td className="p-4 border-b font-medium text-[#C92127]">
                    {book.price ? book.price.toLocaleString("vi-VN") : 0} đ
                  </td>
                  <td className="p-4 border-b">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        book.status === "available"
                          ? "bg-green-100 text-green-700"
                          : book.status === "sold"
                            ? "bg-gray-200 text-gray-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {book.status === "available"
                        ? "Đang bán"
                        : book.status === "sold"
                          ? "Đã bán"
                          : "Đang ẩn"}
                    </span>
                  </td>
                  <td className="p-4 border-b text-right space-x-2">
                    {/* Nút "Đã bán" đã được xóa khỏi đây */}
                    <button
                      onClick={() => handleDelete(book._id)}
                      className="text-sm px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded border border-red-200"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyBooks;
