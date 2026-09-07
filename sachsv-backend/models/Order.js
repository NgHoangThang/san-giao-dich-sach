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
// TỪNG SÁCH TRONG ĐƠN HÀNG
// ------------------------------------------------------
// ĐÃ SỬA: trước đây Order chỉ chứa đúng 1 bookId/price/quantity
// (1 đơn = 1 sách). Giờ đổi sang items[] để 1 đơn có thể chứa nhiều
// sách khác nhau (đặt từ giỏ hàng). "title"/"price" là snapshot tại
// thời điểm đặt — không đọc lại từ Book, để đơn cũ không đổi theo
// nếu sau này admin sửa tên/giá sách hoặc xóa hẳn sách đó.
// ======================================================
const orderItemSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
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
    // CÁC SÁCH ĐƯỢC MUA TRONG ĐƠN NÀY (1 đơn có thể nhiều sách)
    // ==================================================
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "Đơn hàng phải có ít nhất 1 sách",
      },
    },

    // ==================================================
    // TỔNG TIỀN = tổng (price * quantity) của mọi item
    // (lưu sẵn để tránh tính lại)
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
    // THANH TOÁN
    // ------------------------------------------------------
    // ĐÃ THÊM: bắt buộc thanh toán qua QR chuyển khoản ngân hàng
    // trước khi Admin được chuyển đơn sang "preparing" — dùng
    // "!== paid" thay vì "=== unpaid" khi kiểm tra ở mọi nơi, để
    // các đơn cũ tạo trước khi có field này (không có paymentStatus
    // trong DB) vẫn tự động bị coi là chưa thanh toán, không cần
    // migrate script backfill.
    // ==================================================
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },

    paymentConfirmedAt: {
      type: Date,
      default: null,
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
