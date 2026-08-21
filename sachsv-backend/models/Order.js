const mongoose = require("mongoose");

// ======================================================
// LỊCH SỬ TRẠNG THÁI ĐƠN HÀNG
// ======================================================
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "shipping",
        "delivered",
        "completed",
        "cancelled",
      ],
      required: true,
    },

    note: {
      type: String,
      trim: true,
      default: "",
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

// ======================================================
// THÔNG TIN ĐỊA CHỈ GIAO HÀNG
// ======================================================
const shippingAddressSchema = new mongoose.Schema(
  {
    // Họ tên người nhận
    receiverName: {
      type: String,
      required: true,
      trim: true,
    },

    // Số điện thoại người nhận
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // Số nhà + tên đường
    addressLine: {
      type: String,
      required: true,
      trim: true,
    },

    // Phường / Xã
    ward: {
      type: String,
      trim: true,
      default: "",
    },

    // Quận / Huyện
    district: {
      type: String,
      trim: true,
      default: "",
    },

    // Tỉnh / Thành phố
    province: {
      type: String,
      required: true,
      trim: true,
    },

    // Ghi chú giao hàng
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  },
);

// ======================================================
// ORDER SCHEMA
// ======================================================
const orderSchema = new mongoose.Schema(
  {
    // ==================================================
    // NGƯỜI MUA
    // ==================================================
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==================================================
    // NGƯỜI BÁN / ADMIN
    // ==================================================
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==================================================
    // SÁCH ĐƯỢC MUA
    // ==================================================
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },

    // ==================================================
    // GIÁ TẠI THỜI ĐIỂM ĐẶT (giá 1 cuốn)
    // ==================================================
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // ==================================================
    // SỐ LƯỢNG ĐẶT MUA
    // ==================================================
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    // ==================================================
    // TỔNG TIỀN = price * quantity (lưu sẵn để tránh tính lại)
    // ==================================================
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // ==================================================
    // ĐỊA CHỈ GIAO HÀNG
    // Lưu trực tiếp vào Order để sau này User sửa Profile
    // thì đơn cũ vẫn giữ đúng địa chỉ lúc đặt
    // ==================================================
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },

    // ==================================================
    // TRẠNG THÁI ĐƠN HÀNG
    // ==================================================
    status: {
      type: String,
      enum: [
        "pending", // Chờ Admin xác nhận
        "confirmed", // Admin đã xác nhận
        "preparing", // Đang chuẩn bị hàng
        "shipping", // Đang giao
        "delivered", // Admin xác nhận đã giao
        "completed", // User xác nhận đã nhận
        "cancelled", // Đã hủy
      ],
      default: "pending",
    },

    // ==================================================
    // ĐƠN VỊ VẬN CHUYỂN
    // Ví dụ: GHTK, GHN, Viettel Post...
    // ==================================================
    shippingProvider: {
      type: String,
      trim: true,
      default: "",
    },

    // ==================================================
    // MÃ VẬN ĐƠN
    // ==================================================
    trackingCode: {
      type: String,
      trim: true,
      default: "",
    },

    // ==================================================
    // NGÀY DỰ KIẾN GIAO
    // ==================================================
    estimatedDeliveryDate: {
      type: Date,
      default: null,
    },

    // ==================================================
    // VỊ TRÍ / GHI CHÚ VẬN CHUYỂN HIỆN TẠI
    // Ví dụ:
    // "Đã bàn giao cho đơn vị vận chuyển"
    // "Đang giao đến Quận 7"
    // ==================================================
    shippingNote: {
      type: String,
      trim: true,
      default: "",
    },

    // ==================================================
    // CÁC MỐC THỜI GIAN
    // ==================================================

    // Admin xác nhận đơn
    confirmedAt: {
      type: Date,
      default: null,
    },

    // Bắt đầu chuẩn bị hàng
    preparingAt: {
      type: Date,
      default: null,
    },

    // Bắt đầu giao hàng
    shippingAt: {
      type: Date,
      default: null,
    },

    // Admin xác nhận đã giao
    deliveredAt: {
      type: Date,
      default: null,
    },

    // User xác nhận đã nhận
    completedAt: {
      type: Date,
      default: null,
    },

    // Thời gian hủy đơn
    cancelledAt: {
      type: Date,
      default: null,
    },

    // ==================================================
    // LỊCH SỬ TRẠNG THÁI
    // ==================================================
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Order", orderSchema);
