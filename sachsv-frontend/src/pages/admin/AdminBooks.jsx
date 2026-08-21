import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";

import api from "../../services/api";

const CATEGORIES = [
  "Công nghệ thông tin",
  "Kinh tế",
  "Ngoại ngữ",
  "Y Dược",
  "Văn học",
  "Kỹ năng sống",
  "Giáo trình đại cương",
  "Khoa học - Kỹ thuật",
  "Luật",
  "Thiếu nhi - Truyện tranh",
];

const STATUS_META = {
  available: {
    label: "Đang bán",
    className: "bg-green-100 text-green-700 border-green-200",
  },

  sold: {
    label: "Đã bán",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },

  hidden: {
    label: "Đang ẩn",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },

  deleted: {
    label: "Đã xóa",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

const CONDITION_LABELS = {
  new: "Sách mới",
  "like-new": "Như mới",
  used: "Đã sử dụng",
};

const formatPrice = (value) => {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
};

const AdminBooks = () => {
  const [books, setBooks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  // ĐÃ SỬA: mặc định chỉ hiện sách đang bán, để bảng quản lý không
  // bị lẫn sách đã xóa. Muốn xem lại thì chọn trong bộ lọc trạng thái.
  const [selectedStatus, setSelectedStatus] = useState("available");
  const [sortOption, setSortOption] = useState("newest");

  const [editingBook, setEditingBook] = useState(null);

  // ĐÃ THÊM: quản lý ảnh trong form sửa sách
  // newImages     = file ảnh vừa chọn, chưa upload
  // removedImages = URL ảnh cũ mà admin bấm xóa
  const [newImages, setNewImages] = useState([]);
  const [removedImages, setRemovedImages] = useState([]);

  // Trỏ thẳng tới ô chọn file. Bấm nút -> gọi .click() trên ô này.
  // Cách này chắc ăn hơn bọc input trong <label>, vì không phụ thuộc
  // vào việc trình duyệt có chuyển tiếp cú click từ label hay không.
  const fileInputRef = useRef(null);

  const [editForm, setEditForm] = useState({
    title: "",
    author: "",
    category: "",
    price: "",
    originalPrice: "",
    quantity: "",
    condition: "used",
    description: "",
  });

  // ======================================================
  // LOAD TOÀN BỘ SÁCH CỦA ADMIN
  // ======================================================
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/books/my-books");

      const data = Array.isArray(response.data?.data) ? response.data.data : [];

      setBooks(data);
    } catch (requestError) {
      console.error("Lỗi lấy danh sách sách:", requestError);

      setError(
        requestError.response?.data?.message || "Không thể tải danh sách sách.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // ======================================================
  // THỐNG KÊ
  // ======================================================
  const statistics = useMemo(() => {
    return {
      total: books.length,

      available: books.filter((book) => book.status === "available").length,

      sold: books.filter((book) => book.status === "sold").length,

      hidden: books.filter((book) => book.status === "hidden").length,

      deleted: books.filter((book) => book.status === "deleted").length,
    };
  }, [books]);

  // ======================================================
  // LỌC + TÌM KIẾM + SORT
  // ======================================================
  const filteredBooks = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const result = books.filter((book) => {
      const searchableText = [book.title, book.author, book.category, book.isbn]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || searchableText.includes(keyword);

      const matchesCategory =
        selectedCategory === "all" || book.category === selectedCategory;

      const matchesStatus =
        selectedStatus === "all" || book.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    return [...result].sort((a, b) => {
      if (sortOption === "price-low") {
        return Number(a.price || 0) - Number(b.price || 0);
      }

      if (sortOption === "price-high") {
        return Number(b.price || 0) - Number(a.price || 0);
      }

      if (sortOption === "title") {
        return String(a.title || "").localeCompare(String(b.title || ""), "vi");
      }

      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });
  }, [books, searchTerm, selectedCategory, selectedStatus, sortOption]);

  // ======================================================
  // CẬP NHẬT LOCAL SAU ACTION
  // ======================================================
  const updateLocalStatus = (bookId, status) => {
    setBooks((previousBooks) =>
      previousBooks.map((book) =>
        book._id === bookId
          ? {
              ...book,
              status,
            }
          : book,
      ),
    );
  };

  // ======================================================
  // ĐÁNH DẤU ĐÃ BÁN
  // ======================================================
  const handleMarkSold = async (book) => {
    if (!window.confirm(`Đánh dấu "${book.title}" là đã bán?`)) {
      return;
    }

    try {
      setActionLoading(book._id);

      await api.patch(`/api/books/${book._id}/sold`);

      updateLocalStatus(book._id, "sold");
    } catch (requestError) {
      alert(
        requestError.response?.data?.message ||
          "Không thể đánh dấu sách đã bán.",
      );
    } finally {
      setActionLoading("");
    }
  };

  // ======================================================
  // ẨN SÁCH
  // ======================================================
  const handleHide = async (book) => {
    if (!window.confirm(`Bạn muốn ẩn "${book.title}" khỏi người mua?`)) {
      return;
    }

    try {
      setActionLoading(book._id);

      await api.patch(`/api/books/${book._id}/hide`);

      updateLocalStatus(book._id, "hidden");
    } catch (requestError) {
      alert(requestError.response?.data?.message || "Không thể ẩn sách.");
    } finally {
      setActionLoading("");
    }
  };

  // ======================================================
  // HIỆN LẠI
  // ======================================================
  const handleShow = async (book) => {
    try {
      setActionLoading(book._id);

      await api.patch(`/api/books/${book._id}/show`);

      updateLocalStatus(book._id, "available");
    } catch (requestError) {
      alert(requestError.response?.data?.message || "Không thể hiện lại sách.");
    } finally {
      setActionLoading("");
    }
  };

  // ======================================================
  // XÓA SÁCH
  // ======================================================
  const handleDelete = async (book) => {
    if (!window.confirm(`Bạn có chắc muốn xóa "${book.title}"?`)) {
      return;
    }

    try {
      setActionLoading(book._id);

      await api.delete(`/api/books/${book._id}`);

      updateLocalStatus(book._id, "deleted");
    } catch (requestError) {
      alert(requestError.response?.data?.message || "Không thể xóa sách.");
    } finally {
      setActionLoading("");
    }
  };

  // ======================================================
  // MỞ FORM SỬA
  // ======================================================
  const openEditModal = (book) => {
    setEditingBook(book);

    setNewImages([]);
    setRemovedImages([]);

    setEditForm({
      title: book.title || "",
      author: book.author || "",
      category: book.category || "",
      price: book.price ?? "",
      originalPrice: book.originalPrice ?? "",
      quantity: book.quantity ?? 1,
      condition: book.condition || "used",
      description: book.description || "",
    });
  };

  // ======================================================
  // ĐÓNG FORM
  // ======================================================
  const closeEditModal = () => {
    setEditingBook(null);

    setNewImages([]);
    setRemovedImages([]);

    setEditForm({
      title: "",
      author: "",
      category: "",
      price: "",
      originalPrice: "",
      quantity: "",
      condition: "used",
      description: "",
    });
  };

  // ======================================================
  // THAY ĐỔI FORM
  // ======================================================
  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ======================================================
  // LƯU CHỈNH SỬA
  // ======================================================
  const handleSaveEdit = async (event) => {
    event.preventDefault();

    if (!editingBook) {
      return;
    }

    const price = Number(editForm.price);

    if (!editForm.title.trim()) {
      alert("Vui lòng nhập tên sách.");
      return;
    }

    if (!editForm.category) {
      alert("Vui lòng chọn danh mục.");
      return;
    }

    if (!price || price <= 0) {
      alert("Giá bán phải lớn hơn 0.");
      return;
    }

    if (editForm.originalPrice && Number(editForm.originalPrice) <= price) {
      alert("Giá gốc phải lớn hơn giá bán.");
      return;
    }

    const quantityValue = Number(editForm.quantity);

    if (
      editForm.quantity === "" ||
      !Number.isInteger(quantityValue) ||
      quantityValue < 0
    ) {
      alert("Số lượng phải là số nguyên từ 0 trở lên.");
      return;
    }

    try {
      setActionLoading(editingBook._id);

      // ĐÃ SỬA: gửi FormData thay vì JSON, để kèm được file ảnh.
      // api.js tự gỡ header Content-Type khi thấy FormData, nhờ vậy
      // trình duyệt tự thêm "boundary" cho multer đọc được.
      const formData = new FormData();

      formData.append("title", editForm.title.trim());
      formData.append("author", editForm.author.trim());
      formData.append("category", editForm.category);
      formData.append("price", price);
      formData.append("quantity", quantityValue);
      formData.append("condition", editForm.condition);
      formData.append("description", editForm.description.trim());

      if (editForm.originalPrice !== "") {
        formData.append("originalPrice", Number(editForm.originalPrice));
      }

      // Ảnh cũ cần gỡ bỏ
      removedImages.forEach((url) => formData.append("removeImages", url));

      // Ảnh mới cần upload
      newImages.forEach((file) => formData.append("images", file));

      const response = await api.put(`/api/books/${editingBook._id}`, formData);

      const updatedBook = response.data?.book || editingBook;

      setBooks((previousBooks) =>
        previousBooks.map((book) =>
          book._id === editingBook._id
            ? {
                ...book,
                ...updatedBook,
              }
            : book,
        ),
      );

      closeEditModal();

      alert("Cập nhật sách thành công!");
    } catch (requestError) {
      console.error("Lỗi cập nhật sách:", requestError);

      alert(requestError.response?.data?.message || "Không thể cập nhật sách.");
    } finally {
      setActionLoading("");
    }
  };

  // ======================================================
  // RESET FILTER
  // ======================================================
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSortOption("newest");
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ==================================================
            HEADER
        ================================================== */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#9A2F27]">
              Khu vực quản trị
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-800">
              📚 Quản lý sách
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Quản lý toàn bộ sách đang có trên hệ thống Sách SV.
            </p>
          </div>

          <Link
            to="/create-book"
            className="inline-flex items-center justify-center rounded-xl bg-[#9A2F27] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#7A241D]"
          >
            + Đăng sách mới
          </Link>
        </div>

        {/* ==================================================
            THỐNG KÊ
        ================================================== */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Tổng sách" value={statistics.total} icon="📚" />

          <StatCard label="Đang bán" value={statistics.available} icon="🟢" />

          <StatCard label="Đã bán" value={statistics.sold} icon="✅" />

          <StatCard label="Đang ẩn" value={statistics.hidden} icon="🙈" />

          <StatCard label="Đã xóa" value={statistics.deleted} icon="🗑️" />
        </div>

        {/* ==================================================
            FILTER
        ================================================== */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm tên sách, tác giả, ISBN..."
              className="h-11 rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#9A2F27]"
            />

            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none"
            >
              <option value="all">Tất cả danh mục</option>

              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none"
            >
              <option value="all">Tất cả trạng thái</option>

              <option value="available">Đang bán</option>

              <option value="sold">Đã bán</option>

              <option value="hidden">Đang ẩn</option>

              <option value="deleted">Đã xóa</option>
            </select>

            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value)}
              className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none"
            >
              <option value="newest">Mới nhất</option>

              <option value="price-low">Giá thấp → cao</option>

              <option value="price-high">Giá cao → thấp</option>

              <option value="title">Tên A → Z</option>
            </select>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Tìm thấy{" "}
              <span className="font-bold text-[#9A2F27]">
                {filteredBooks.length}
              </span>{" "}
              sách
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-semibold text-[#9A2F27] hover:underline"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>

        {/* ==================================================
            LOADING
        ================================================== */}
        {loading && (
          <div className="mt-8 rounded-2xl border bg-white p-12 text-center shadow-sm">
            <p className="text-gray-500">Đang tải danh sách sách...</p>
          </div>
        )}

        {/* ==================================================
            ERROR
        ================================================== */}
        {!loading && error && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">⚠️</div>

            <p className="mt-3 text-sm text-red-600">{error}</p>

            <button
              type="button"
              onClick={fetchBooks}
              className="mt-4 rounded-xl bg-[#9A2F27] px-5 py-2.5 text-sm font-bold text-white"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* ==================================================
            TABLE
        ================================================== */}
        {!loading && !error && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {filteredBooks.length === 0 ? (
              <div className="p-14 text-center">
                <div className="text-5xl">📭</div>

                <h3 className="mt-4 text-lg font-bold text-gray-800">
                  Không tìm thấy sách
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left">
                  <thead className="bg-gray-50">
                    <tr className="text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-5 py-4">Sách</th>

                      <th className="px-5 py-4">Danh mục</th>

                      <th className="px-5 py-4">Tình trạng</th>

                      <th className="px-5 py-4">Giá</th>

                      <th className="px-5 py-4">Trạng thái</th>

                      <th className="px-5 py-4">Ngày đăng</th>

                      <th className="px-5 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredBooks.map((book) => {
                      const status =
                        STATUS_META[book.status] || STATUS_META.available;

                      const isProcessing = actionLoading === book._id;

                      return (
                        <tr
                          key={book._id}
                          className="border-t border-gray-100 transition hover:bg-gray-50"
                        >
                          {/* SÁCH */}
                          <td className="px-5 py-4">
                            <div className="flex min-w-[240px] items-center gap-3">
                              <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg border bg-gray-100">
                                {book.images?.[0] ? (
                                  <img
                                    src={book.images[0]}
                                    alt={book.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-xl">
                                    📖
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-[230px] truncate font-bold text-gray-800">
                                  {book.title}
                                </p>

                                <p className="mt-1 max-w-[230px] truncate text-xs text-gray-500">
                                  {book.author || "Chưa rõ tác giả"}
                                </p>

                                {book.isbn && (
                                  <p className="mt-1 text-[11px] text-gray-400">
                                    ISBN: {book.isbn}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* DANH MỤC */}
                          <td className="px-5 py-4 text-sm text-gray-600">
                            {book.category}
                          </td>

                          {/* CONDITION */}
                          <td className="px-5 py-4 text-sm text-gray-600">
                            {CONDITION_LABELS[book.condition] || book.condition}
                          </td>

                          {/* GIÁ */}
                          <td className="px-5 py-4">
                            <p className="font-bold text-[#9A2F27]">
                              {formatPrice(book.price)}
                            </p>

                            {book.originalPrice && (
                              <p className="mt-1 text-xs text-gray-400 line-through">
                                {formatPrice(book.originalPrice)}
                              </p>
                            )}
                          </td>

                          {/* STATUS */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>

                          {/* NGÀY */}
                          <td className="px-5 py-4 text-sm text-gray-500">
                            {book.createdAt
                              ? new Date(book.createdAt).toLocaleDateString(
                                  "vi-VN",
                                )
                              : "--"}
                          </td>

                          {/* ACTIONS */}
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Link
                                to={`/books/${book._id}`}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                              >
                                Xem
                              </Link>

                              {book.status !== "deleted" && (
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => openEditModal(book)}
                                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                                >
                                  Sửa
                                </button>
                              )}

                              {book.status === "available" && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => handleMarkSold(book)}
                                    className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                                  >
                                    Đã bán
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => handleHide(book)}
                                    className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-700 transition hover:bg-yellow-100 disabled:opacity-50"
                                  >
                                    Ẩn
                                  </button>
                                </>
                              )}

                              {book.status === "hidden" && (
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleShow(book)}
                                  className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                                >
                                  Hiện
                                </button>
                              )}

                              {book.status !== "sold" &&
                                book.status !== "deleted" && (
                                  <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => handleDelete(book)}
                                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                  >
                                    Xóa
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====================================================
          MODAL SỬA SÁCH
      ==================================================== */}
      {editingBook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#9A2F27]">
                  Chỉnh sửa
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-800">
                  Cập nhật thông tin sách
                </h2>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* TITLE */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Tên sách
                  </label>

                  <input
                    name="title"
                    value={editForm.title}
                    onChange={handleEditChange}
                    className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#9A2F27]"
                  />
                </div>

                {/* AUTHOR */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Tác giả
                  </label>

                  <input
                    name="author"
                    value={editForm.author}
                    onChange={handleEditChange}
                    className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#9A2F27]"
                  />
                </div>

                {/* CATEGORY */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Danh mục
                  </label>

                  <select
                    name="category"
                    value={editForm.category}
                    onChange={handleEditChange}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none"
                  >
                    <option value="">Chọn danh mục</option>

                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PRICE */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Giá bán
                  </label>

                  <input
                    type="number"
                    name="price"
                    value={editForm.price}
                    onChange={handleEditChange}
                    className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#9A2F27]"
                  />
                </div>

                {/* ORIGINAL PRICE */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Giá gốc
                  </label>

                  <input
                    type="number"
                    name="originalPrice"
                    value={editForm.originalPrice}
                    onChange={handleEditChange}
                    className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#9A2F27]"
                  />
                </div>

                {/* QUANTITY */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Số lượng còn lại
                  </label>

                  <input
                    type="number"
                    name="quantity"
                    min="0"
                    value={editForm.quantity}
                    onChange={handleEditChange}
                    className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#9A2F27]"
                  />

                  <p className="mt-1 text-xs text-gray-400">
                    Đặt về 0 nếu hết hàng, tăng lên nếu nhập thêm sách mới.
                  </p>
                </div>

                {/* CONDITION */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Tình trạng
                  </label>

                  <select
                    name="condition"
                    value={editForm.condition}
                    onChange={handleEditChange}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none"
                  >
                    <option value="new">Sách mới</option>

                    <option value="like-new">Như mới</option>

                    <option value="used">Đã sử dụng</option>
                  </select>
                </div>

                {/* ẢNH SÁCH — ĐÃ THÊM */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Ảnh sách
                  </label>

                  <div className="flex flex-wrap gap-3">
                    {/* Ảnh hiện có, trừ những ảnh đã bấm xóa */}
                    {(editingBook.images || [])
                      .filter((url) => !removedImages.includes(url))
                      .map((url) => (
                        <div key={url} className="relative">
                          <img
                            src={url}
                            alt=""
                            className="h-28 w-20 rounded-lg border object-cover"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setRemovedImages((previous) => [...previous, url])
                            }
                            title="Xóa ảnh này"
                            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow hover:bg-red-700"
                          >
                            ×
                          </button>
                        </div>
                      ))}

                    {/* Ảnh mới chọn, chưa upload — viền xanh lá */}
                    {newImages.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt=""
                          className="h-28 w-20 rounded-lg border-2 border-green-500 object-cover"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setNewImages((previous) =>
                              previous.filter((_, i) => i !== index),
                            )
                          }
                          title="Bỏ ảnh này"
                          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 text-xs font-bold text-white shadow hover:bg-gray-900"
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    {/* Nút thêm ảnh */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-28 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-2xl text-gray-400 transition hover:border-[#9A2F27] hover:text-[#9A2F27]"
                    >
                      +
                    </button>
                  </div>

                  {/* Ô chọn file thật, nằm ngoài vòng lặp và luôn tồn tại */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    multiple
                    style={{ display: "none" }}
                    onChange={(event) => {
                      const chosen = Array.from(event.target.files || []);

                      console.log("Đã chọn", chosen.length, "ảnh:", chosen);

                      if (chosen.length > 0) {
                        setNewImages((previous) => [...previous, ...chosen]);
                      }

                      // Reset để chọn lại đúng file đó vẫn kích hoạt onChange
                      event.target.value = "";
                    }}
                  />

                  {newImages.length > 0 && (
                    <p className="mt-2 text-xs font-semibold text-green-700">
                      Đã chọn {newImages.length} ảnh mới, bấm Lưu thay đổi để
                      tải lên.
                    </p>
                  )}

                  <p className="mt-2 text-xs text-gray-500">
                    Tối đa 10 ảnh, mỗi ảnh dưới 5MB, chỉ nhận JPG và PNG. Ảnh
                    viền xanh là ảnh mới, chỉ được tải lên khi bấm Lưu thay đổi.
                  </p>
                </div>

                {/* DESCRIPTION */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Mô tả
                  </label>

                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                    rows={5}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#9A2F27]"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={actionLoading === editingBook._id}
                  className="rounded-xl bg-[#9A2F27] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#7A241D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === editingBook._id
                    ? "Đang lưu..."
                    : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ======================================================
// CARD THỐNG KÊ
// ======================================================
const StatCard = ({ icon, value, label }) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FBF7F0] text-xl">
          {icon}
        </div>

        <div>
          <p className="text-2xl font-bold text-gray-800">{value}</p>

          <p className="text-xs font-medium text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminBooks;
