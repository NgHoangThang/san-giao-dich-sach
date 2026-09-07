const express = require("express");

const router = express.Router();

const messageController = require("../controllers/messageController");

const authMiddleware = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");

// Gửi tin nhắn
router.post("/", authMiddleware, messageController.sendMessage);

// Đếm tin nhắn chưa đọc
// Bắt buộc nằm trước /:conversationId
router.get("/unread/count", authMiddleware, messageController.getUnreadCount);

// Lấy tin nhắn của một cuộc trò chuyện
router.get(
  "/:conversationId",
  authMiddleware,
  validateObjectId("conversationId"),
  messageController.getMessages,
);

// Đánh dấu đã đọc
router.patch(
  "/:conversationId/read",
  authMiddleware,
  validateObjectId("conversationId"),
  messageController.markAsRead,
);

module.exports = router;
