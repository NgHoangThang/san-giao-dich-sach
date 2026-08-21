const mongoose = require("mongoose");

// ======================================================
// SHIPPING TRACKING
// Lưu từng mốc xử lý / vận chuyển của một đơn hàng
// ======================================================
const shippingTrackingSchema = new mongoose.Schema(
  {
    // ==================================================
    // ĐƠN HÀNG
    // ==================================================
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    // ==================================================
    // TRẠNG THÁI TẠI MỐC NÀY
    // ==================================================
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

    // ==================================================
    // TIÊU ĐỀ MỐC THEO DÕI
    // ==================================================
    title: {
      type: String,
      trim: true,
      default: "",
    },

    // ==================================================
    // VỊ TRÍ HIỆN TẠI
    // Ví dụ:
    // "Kho Trà Vinh"
    // "Bưu cục trung tâm"
    // "Đang giao tại Phường Trà Vinh"
    // ==================================================
    location: {
      type: String,
      trim: true,
      default: "",
    },

    // ==================================================
    // GHI CHÚ
    // ==================================================
    note: {
      type: String,
      trim: true,
      default: "",
    },

    // ==================================================
    // ĐƠN VỊ VẬN CHUYỂN
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
    // NGƯỜI THỰC HIỆN CẬP NHẬT
    // Admin hoặc User
    // ==================================================
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// ======================================================
// SẮP XẾP NHANH LỊCH SỬ CỦA MỘT ĐƠN
// ======================================================
shippingTrackingSchema.index({
  orderId: 1,
  createdAt: 1,
});

module.exports = mongoose.model("ShippingTracking", shippingTrackingSchema);
