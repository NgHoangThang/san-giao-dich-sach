const mongoose = require("mongoose");

// Kiểm tra số lượng ảnh không vượt quá 10
function arrayLimit(value) {
  return value.length <= 10;
}

const bookSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    author: {
      type: String,
      trim: true,
      default: "",
    },

    // Nhà xuất bản
    publisher: {
      type: String,
      trim: true,
      default: "",
    },

    // Năm xuất bản
    year: {
      type: Number,
      min: 1000,
      default: null,
    },

    // Số trang
    pages: {
      type: Number,
      min: 1,
      default: null,
    },

    // Trọng lượng theo gram
    weight: {
      type: Number,
      min: 1,
      default: null,
    },

    // Mã ISBN
    isbn: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      required: true,
      enum: [
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
      ],
    },

    // Giá đang bán
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Giá gốc trước khi giảm
    originalPrice: {
      type: Number,
      min: 0,
      default: null,
    },

    condition: {
      type: String,
      required: true,
      enum: ["new", "like-new", "used"],
    },

    // Số lượng sách còn lại có thể bán
    // Khi = 0, sách tự chuyển sang status "sold"
    quantity: {
      type: Number,
      min: 0,
      default: 1,
    },

    images: {
      type: [String],
      default: [],
      validate: [arrayLimit, "Chỉ được tải lên tối đa 10 ảnh."],
    },

    status: {
      type: String,
      enum: ["available", "sold", "hidden", "deleted"],
      default: "available",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Book", bookSchema);
