const Notification = require("../models/Notification");
const respondServerError = require("../utils/respondServerError");

// 1. Lấy danh sách thông báo của người dùng hiện tại
exports.getNotifications = async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user._id;
    const notifications = await Notification.find({ receiverId: currentUserId })
      .populate("senderId", "fullName avatar")
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (error) {
    respondServerError(res, error, "Lỗi server khi lấy thông báo");
  }
};

// 2. Đánh dấu tất cả thông báo của người dùng là đã đọc
exports.markAllAsRead = async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user._id;
    await Notification.updateMany(
      { receiverId: currentUserId, isRead: false },
      { isRead: true },
    );
    res.status(200).json({ message: "Đã đánh dấu đọc tất cả thông báo" });
  } catch (error) {
    respondServerError(res, error, "Lỗi server khi cập nhật thông báo");
  }
};
