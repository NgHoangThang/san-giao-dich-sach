import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

const CATEGORIES = [
  {
    value: "Công nghệ thông tin",
    label: "💻 Công nghệ thông tin",
  },
  {
    value: "Kinh tế",
    label: "📊 Kinh tế",
  },
  {
    value: "Ngoại ngữ",
    label: "🌍 Ngoại ngữ",
  },
  {
    value: "Y Dược",
    label: "🏥 Y Dược",
  },
  {
    value: "Văn học",
    label: "📖 Văn học",
  },
  {
    value: "Kỹ năng sống",
    label: "🎯 Kỹ năng sống",
  },
  {
    value: "Giáo trình đại cương",
    label: "🎓 Giáo trình đại cương",
  },
  {
    value: "Khoa học - Kỹ thuật",
    label: "🔬 Khoa học - Kỹ thuật",
  },
  {
    value: "Luật",
    label: "⚖️ Luật",
  },
  {
    value: "Thiếu nhi - Truyện tranh",
    label: "🎨 Thiếu nhi - Truyện tranh",
  },
];

const CONDITIONS = [
  {
    value: "new",
    label: "Mới 100%",
    color: "bg-green-100 text-green-700",
  },
  {
    value: "like-new",
    label: "Như mới",
    color: "bg-blue-100 text-blue-700",
  },
  {
    value: "used",
    label: "Đã dùng",
    color: "bg-orange-100 text-orange-700",
  },
];

const inputClass =
  "w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none transition-all text-gray-800 placeholder-gray-400";

const InputField = ({ label, required, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
      {hint && <span className="text-gray-400 font-normal ml-1">({hint})</span>}
    </label>

    {children}
  </div>
);

const SectionHeader = ({ number, title }) => (
  <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
    <span className="w-6 h-6 bg-[#1E3A5F] rounded-lg flex items-center justify-center text-white text-xs">
      {number}
    </span>

    {title}
  </h2>
);

const CreateBook = () => {
  const navigate = useNavigate();

  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);

  const [images, setImages] = useState([]);

  const [previews, setPreviews] = useState([]);

  const [dragOver, setDragOver] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    publisher: "",
    year: "",
    pages: "",
    weight: "",
    isbn: "",
    price: "",
    originalPrice: "",
    quantity: "1",
    category: "Công nghệ thông tin",
    condition: "new",
  });

  // ======================================================
  // KIỂM TRA QUYỀN ADMIN
  // ======================================================
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    if (user.role !== "admin") {
      toast.error("Chỉ Admin mới có quyền đăng sách");

      navigate("/", {
        replace: true,
      });
    }
  }, [user, authLoading, navigate]);

  // ======================================================
  // THAY ĐỔI DỮ LIỆU FORM
  // ======================================================
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // ======================================================
  // XỬ LÝ CÁC FILE ẢNH ĐƯỢC CHỌN
  // ======================================================
  const processFiles = (files) => {
    const newFiles = Array.from(files || []);

    if (newFiles.length === 0) {
      return;
    }

    // Kiểm tra định dạng
    const invalidFile = newFiles.find(
      (file) => !ALLOWED_TYPES.includes(file.type),
    );

    if (invalidFile) {
      toast.error(`"${invalidFile.name}" không phải ảnh JPG hoặc PNG`);

      return;
    }

    // Kiểm tra dung lượng
    const oversizedFile = newFiles.find((file) => file.size > MAX_FILE_SIZE);

    if (oversizedFile) {
      toast.error(`"${oversizedFile.name}" vượt quá 5MB`);

      return;
    }

    // Gộp ảnh đã chọn trước đó với ảnh mới
    const combinedImages = [...images, ...newFiles];

    // Kiểm tra tổng số ảnh
    if (combinedImages.length > MAX_IMAGES) {
      toast.error(`Chỉ được chọn tối đa ${MAX_IMAGES} ảnh`);

      return;
    }

    setImages(combinedImages);

    // Giữ preview cũ và thêm preview mới
    setPreviews((previousPreviews) => [
      ...previousPreviews,
      ...newFiles.map((file) => URL.createObjectURL(file)),
    ]);
  };

  // ======================================================
  // CHỌN ẢNH TỪ MÁY TÍNH
  // ======================================================
  const handleImageChange = (event) => {
    processFiles(event.target.files);

    // Cho phép chọn lại cùng một file
    event.target.value = "";
  };

  // ======================================================
  // KÉO THẢ ẢNH
  // ======================================================
  const handleDrop = (event) => {
    event.preventDefault();

    setDragOver(false);

    processFiles(event.dataTransfer.files);
  };

  // ======================================================
  // XÓA MỘT ẢNH
  // ======================================================
  const removeImage = (indexToRemove) => {
    if (previews[indexToRemove]) {
      URL.revokeObjectURL(previews[indexToRemove]);
    }

    setImages((previousImages) =>
      previousImages.filter((_, index) => index !== indexToRemove),
    );

    setPreviews((previousPreviews) =>
      previousPreviews.filter((_, index) => index !== indexToRemove),
    );
  };

  // ======================================================
  // KIỂM TRA DỮ LIỆU FORM
  // ======================================================
  const validateForm = () => {
    // Kiểm tra tên sách
    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tên sách");
      return false;
    }

    if (formData.title.trim().length > 200) {
      toast.error("Tên sách không được vượt quá 200 ký tự");
      return false;
    }

    // Kiểm tra giá bán
    const sellingPrice = Number(formData.price);

    if (!formData.price || Number.isNaN(sellingPrice) || sellingPrice <= 0) {
      toast.error("Giá bán phải lớn hơn 0");
      return false;
    }

    // Kiểm tra giá gốc
    if (formData.originalPrice) {
      const originalPrice = Number(formData.originalPrice);

      if (Number.isNaN(originalPrice) || originalPrice <= sellingPrice) {
        toast.error("Giá gốc phải lớn hơn giá bán");
        return false;
      }
    }

    // Kiểm tra năm xuất bản
    if (formData.year) {
      const year = Number(formData.year);
      const maximumYear = new Date().getFullYear() + 1;

      if (Number.isNaN(year) || year < 1000 || year > maximumYear) {
        toast.error(
          `Năm xuất bản phải nằm trong khoảng 1000 đến ${maximumYear}`,
        );

        return false;
      }
    }

    // Kiểm tra số trang
    if (formData.pages) {
      const pages = Number(formData.pages);

      if (Number.isNaN(pages) || pages <= 0) {
        toast.error("Số trang phải lớn hơn 0");
        return false;
      }
    }

    // Kiểm tra trọng lượng
    if (formData.weight) {
      const weight = Number(formData.weight);

      if (Number.isNaN(weight) || weight <= 0) {
        toast.error("Trọng lượng phải lớn hơn 0");
        return false;
      }
    }

    // Kiểm tra số lượng
    const quantityValue = Number(formData.quantity);

    if (
      formData.quantity === "" ||
      !Number.isInteger(quantityValue) ||
      quantityValue < 1
    ) {
      toast.error("Số lượng phải là số nguyên lớn hơn 0");
      return false;
    }

    // Kiểm tra danh mục
    if (!formData.category) {
      toast.error("Vui lòng chọn danh mục sách");
      return false;
    }

    // Kiểm tra tình trạng
    if (!formData.condition) {
      toast.error("Vui lòng chọn tình trạng sách");
      return false;
    }

    // Kiểm tra số lượng ảnh
    if (images.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 ảnh");
      return false;
    }

    if (images.length > MAX_IMAGES) {
      toast.error(`Chỉ được chọn tối đa ${MAX_IMAGES} ảnh`);

      return false;
    }

    // Kiểm tra định dạng ảnh lần cuối
    const invalidFile = images.find(
      (file) => !ALLOWED_TYPES.includes(file.type),
    );

    if (invalidFile) {
      toast.error(`"${invalidFile.name}" không phải ảnh JPG hoặc PNG`);

      return false;
    }

    // Kiểm tra dung lượng ảnh lần cuối
    const oversizedFile = images.find((file) => file.size > MAX_FILE_SIZE);

    if (oversizedFile) {
      toast.error(`"${oversizedFile.name}" vượt quá 5MB`);

      return false;
    }

    return true;
  };

  // ======================================================
  // GỬI FORM ĐĂNG SÁCH
  // ======================================================
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const data = new FormData();

      // Dữ liệu bắt buộc
      data.append("title", formData.title.trim());

      data.append("category", formData.category);

      data.append("condition", formData.condition);

      data.append("price", String(Number(formData.price)));

      data.append("quantity", String(Number(formData.quantity)));

      // Ảnh
      images.forEach((image) => {
        data.append("images", image);
      });

      // Dữ liệu tùy chọn
      if (formData.author.trim()) {
        data.append("author", formData.author.trim());
      }

      if (formData.description.trim()) {
        data.append("description", formData.description.trim());
      }

      if (formData.publisher.trim()) {
        data.append("publisher", formData.publisher.trim());
      }

      if (formData.isbn.trim()) {
        data.append("isbn", formData.isbn.trim());
      }

      if (formData.year) {
        data.append("year", String(Number(formData.year)));
      }

      if (formData.pages) {
        data.append("pages", String(Number(formData.pages)));
      }

      if (formData.weight) {
        data.append("weight", String(Number(formData.weight)));
      }

      if (formData.originalPrice) {
        data.append("originalPrice", String(Number(formData.originalPrice)));
      }

      await api.post("/api/books/create", data);

      toast.success("Đăng sách thành công!");

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      console.error("Lỗi đăng sách:", error);

      const backendMessage = error.response?.data?.message;
      const backendDetails = error.response?.data?.details;
      const backendError = error.response?.data?.error;

      toast.error(
        [backendMessage, backendDetails].filter(Boolean).join(" — ") ||
          backendError ||
          "Có lỗi xảy ra khi đăng sách",
        { duration: 8000 },
      );
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user || user.role !== "admin") {
    return null;
  }

  const currentCondition = CONDITIONS.find(
    (condition) => condition.value === formData.condition,
  );

  return (
    <div className="min-h-screen bg-[#F8F7F4] py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[#F59E0B] text-xs font-semibold uppercase tracking-widest mb-1">
            Khu vực Admin
          </p>

          <h1 className="text-3xl font-bold text-[#1E3A5F]">Đăng sách mới</h1>

          <p className="text-gray-500 mt-1">
            Điền đầy đủ thông tin để đăng sách lên sàn
          </p>
        </div>

        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Bước 1 */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <SectionHeader number="1" title="Thông tin sách" />

                <div className="space-y-4">
                  <InputField label="Tên sách" required>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Ví dụ: Giáo Trình Lập Trình Python"
                      maxLength={200}
                      className={inputClass}
                    />

                    <p
                      className={`mt-1 text-right text-xs ${
                        formData.title.length > 180
                          ? "text-red-500 font-semibold"
                          : "text-gray-400"
                      }`}
                    >
                      {formData.title.length}/200 ký tự
                    </p>
                  </InputField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Tác giả">
                      <input
                        type="text"
                        name="author"
                        value={formData.author}
                        onChange={handleChange}
                        placeholder="Nguyễn Văn A"
                        className={inputClass}
                      />
                    </InputField>

                    <InputField label="Nhà xuất bản">
                      <input
                        type="text"
                        name="publisher"
                        value={formData.publisher}
                        onChange={handleChange}
                        placeholder="NXB Dân Trí"
                        className={inputClass}
                      />
                    </InputField>
                  </div>

                  <InputField label="Mô tả sản phẩm">
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Giới thiệu nội dung, phiên bản, tình trạng giấy..."
                      className={`${inputClass} resize-none`}
                    />
                  </InputField>
                </div>
              </div>

              {/* Bước 2 */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <SectionHeader number="2" title="Thông tin xuất bản" />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <InputField label="Năm XB">
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      min="1000"
                      max={new Date().getFullYear() + 1}
                      placeholder="2024"
                      className={inputClass}
                    />
                  </InputField>

                  <InputField label="Số trang">
                    <input
                      type="number"
                      name="pages"
                      value={formData.pages}
                      onChange={handleChange}
                      min="1"
                      placeholder="350"
                      className={inputClass}
                    />
                  </InputField>

                  <InputField label="Trọng lượng" hint="gram">
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      min="1"
                      placeholder="350"
                      className={inputClass}
                    />
                  </InputField>

                  <InputField label="Mã ISBN">
                    <input
                      type="text"
                      name="isbn"
                      value={formData.isbn}
                      onChange={handleChange}
                      placeholder="8936225390416"
                      className={inputClass}
                    />
                  </InputField>
                </div>
              </div>

              {/* Bước 3 */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <SectionHeader number="3" title="Phân loại & Giá" />

                <div className="space-y-4">
                  <InputField label="Danh mục" required>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map((category) => (
                        <button
                          key={category.value}
                          type="button"
                          onClick={() =>
                            setFormData((previousData) => ({
                              ...previousData,
                              category: category.value,
                            }))
                          }
                          className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
                            formData.category === category.value
                              ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
                              : "bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]"
                          }`}
                        >
                          {category.label}
                        </button>
                      ))}
                    </div>
                  </InputField>

                  <InputField label="Tình trạng" required>
                    <div className="flex gap-2">
                      {CONDITIONS.map((condition) => (
                        <button
                          key={condition.value}
                          type="button"
                          onClick={() =>
                            setFormData((previousData) => ({
                              ...previousData,
                              condition: condition.value,
                            }))
                          }
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                            formData.condition === condition.value
                              ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
                              : "bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]"
                          }`}
                        >
                          {condition.label}
                        </button>
                      ))}
                    </div>
                  </InputField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Giá bán (VNĐ)" required>
                      <div className="relative">
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleChange}
                          min="1"
                          placeholder="130000"
                          className={`${inputClass} pr-8`}
                        />

                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          đ
                        </span>
                      </div>

                      {formData.price && Number(formData.price) > 0 && (
                        <p className="text-xs text-[#F59E0B] mt-1 font-medium">
                          = {Number(formData.price).toLocaleString("vi-VN")}đ
                        </p>
                      )}
                    </InputField>

                    <InputField label="Giá gốc (VNĐ)" hint="để tính % giảm">
                      <div className="relative">
                        <input
                          type="number"
                          name="originalPrice"
                          value={formData.originalPrice}
                          onChange={handleChange}
                          min="0"
                          placeholder="195000"
                          className={`${inputClass} pr-8`}
                        />

                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          đ
                        </span>
                      </div>

                      {formData.originalPrice &&
                        formData.price &&
                        Number(formData.originalPrice) >
                          Number(formData.price) && (
                          <p className="text-xs text-green-600 mt-1 font-medium">
                            Giảm{" "}
                            {Math.round(
                              (1 -
                                Number(formData.price) /
                                  Number(formData.originalPrice)) *
                                100,
                            )}
                            %
                          </p>
                        )}
                    </InputField>

                    <InputField label="Số lượng" required hint="mặc định 1">
                      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((previousData) => ({
                              ...previousData,
                              quantity: String(
                                Math.max(
                                  1,
                                  Number(previousData.quantity || 1) - 1,
                                ),
                              ),
                            }))
                          }
                          className="px-4 py-2.5 text-gray-500 hover:bg-gray-50"
                        >
                          −
                        </button>

                        <input
                          type="number"
                          name="quantity"
                          value={formData.quantity}
                          onChange={handleChange}
                          min="1"
                          className="w-full text-center px-2 py-2.5 outline-none text-gray-800 border-x border-gray-200"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setFormData((previousData) => ({
                              ...previousData,
                              quantity: String(
                                Number(previousData.quantity || 1) + 1,
                              ),
                            }))
                          }
                          className="px-4 py-2.5 text-gray-500 hover:bg-gray-50"
                        >
                          +
                        </button>
                      </div>
                    </InputField>
                  </div>
                </div>
              </div>

              {/* Bước 4 */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <SectionHeader number="4" title="Hình ảnh" />

                <div
                  onDrop={handleDrop}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => document.getElementById("imageInput")?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    dragOver
                      ? "border-[#1E3A5F] bg-blue-50"
                      : "border-gray-200 hover:border-[#1E3A5F] hover:bg-gray-50"
                  }`}
                >
                  <div className="text-4xl mb-2">📸</div>

                  <p className="text-gray-600 font-medium text-sm">
                    Kéo thả ảnh hoặc{" "}
                    <span className="text-[#1E3A5F] underline">chọn file</span>
                  </p>

                  <p className="text-gray-400 text-xs mt-1">
                    JPG, PNG — tối đa 10 ảnh, mỗi ảnh &lt; 5MB
                  </p>

                  <input
                    id="imageInput"
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>

                {previews.length > 0 && (
                  <div className="flex gap-3 mt-4 flex-wrap">
                    {previews.map((preview, index) => (
                      <div
                        key={`${preview}-${index}`}
                        className="relative group"
                      >
                        <img
                          src={preview}
                          alt={`Ảnh xem trước ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-xl border border-gray-200"
                        />

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();

                            removeImage(index);
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>

                        {index === 0 && (
                          <span className="absolute bottom-1 left-1 text-xs bg-[#1E3A5F] text-white px-1.5 py-0.5 rounded-md">
                            Bìa
                          </span>
                        )}
                      </div>
                    ))}

                    {previews.length < MAX_IMAGES && (
                      <button
                        type="button"
                        onClick={() =>
                          document.getElementById("imageInput")?.click()
                        }
                        className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:border-[#1E3A5F] transition-colors text-2xl"
                      >
                        +
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Nút đăng */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-bold rounded-2xl transition-colors disabled:opacity-60 text-base shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />

                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Đang đăng sách...
                  </span>
                ) : (
                  "🚀 Đăng sách lên sàn"
                )}
              </button>
            </div>

            {/* Xem trước */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Xem trước
                </p>

                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  <div className="h-52 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {previews[0] ? (
                      <img
                        src={previews[0]}
                        alt="Ảnh bìa xem trước"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <p className="text-4xl mb-2">📚</p>

                        <p className="text-gray-300 text-xs">Chưa có ảnh</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-[#1E3A5F] bg-blue-50 px-2 py-0.5 rounded-full">
                        {CATEGORIES.find(
                          (category) => category.value === formData.category,
                        )
                          ?.label.split(" ")
                          .slice(1)
                          .join(" ")}
                      </span>

                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${currentCondition?.color}`}
                      >
                        {currentCondition?.label}
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1 min-h-[2.5rem]">
                      {formData.title || (
                        <span className="text-gray-300">Tên sách...</span>
                      )}
                    </h3>

                    {formData.author && (
                      <p className="text-gray-400 text-xs mb-1">
                        {formData.author}
                      </p>
                    )}

                    {formData.publisher && (
                      <p className="text-gray-400 text-xs mb-2">
                        NXB {formData.publisher}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                      <div>
                        <span className="text-base font-bold text-[#F59E0B]">
                          {formData.price ? (
                            `${Number(formData.price).toLocaleString("vi-VN")}đ`
                          ) : (
                            <span className="text-gray-300 text-sm">
                              Giá...
                            </span>
                          )}
                        </span>

                        {formData.originalPrice &&
                          Number(formData.originalPrice) >
                            Number(formData.price) && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs text-gray-400 line-through">
                                {Number(formData.originalPrice).toLocaleString(
                                  "vi-VN",
                                )}
                                đ
                              </span>

                              <span className="text-xs bg-red-500 text-white px-1 rounded font-bold">
                                -
                                {Math.round(
                                  (1 -
                                    Number(formData.price) /
                                      Number(formData.originalPrice)) *
                                    100,
                                )}
                                %
                              </span>
                            </div>
                          )}
                      </div>

                      <span className="px-3 py-1.5 bg-[#1E3A5F] text-white text-xs font-medium rounded-lg">
                        Chi tiết
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-400 text-center mt-3">
                  Card sẽ hiện như thế này trên trang chủ
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBook;
