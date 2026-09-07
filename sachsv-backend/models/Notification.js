const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // ĐÃ SỬA: enum trước đây chỉ có 4 giá trị nên các thông báo
    // order_preparing/order_shipping/order_shipping_update/
    // order_delivered/order_completed mà orderController.js gửi lên
    // đều bị Mongoose chặn validate (lỗi bị nuốt âm thầm trong
    // sendSafeNotification) -> user không bao giờ nhận được các
    // thông báo này. Enum ở đây phải khớp với mọi giá trị "type"
    // truyền vào sendNotification()/sendSafeNotification() trong
    // orderController.js và reviewController.js.
    type: {
      type: String,
      enum: [
        "order_created",
        "order_accepted",
        "payment_confirmed",
        "order_preparing",
        "order_shipping",
        "order_shipping_update",
        "order_delivered",
        "order_completed",
        "order_canceled",
        "review_created",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId, // ID của Đơn hàng hoặc Đánh giá tương ứng
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
