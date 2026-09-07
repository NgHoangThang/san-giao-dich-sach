const mongoose = require("mongoose");

// ======================================================
// CART ITEM
// ======================================================
const cartItemSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  {
    _id: false,
  },
);

// ======================================================
// CART
// Mỗi user chỉ có đúng 1 giỏ hàng (unique userId). Lưu server-side
// để đồng bộ giữa nhiều thiết bị/tab thay vì chỉ lưu ở localStorage.
// ------------------------------------------------------
// Không lưu "price" trong item — giá luôn lấy real-time từ Book mỗi
// lần xem giỏ/checkout, tránh giỏ hàng hiển thị giá cũ nếu admin đổi
// giá sau khi khách đã thêm vào giỏ.
// ======================================================
const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Cart", cartSchema);
