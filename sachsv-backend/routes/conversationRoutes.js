const express = require("express");

const router = express.Router();

const conversationController = require("../controllers/conversationController");

const authMiddleware = require("../middleware/authMiddleware");

// Tạo hoặc lấy cuộc trò chuyện
router.post(
  "/",
  authMiddleware,
  conversationController.getOrCreateConversation,
);

// Danh sách cuộc trò chuyện
router.get("/", authMiddleware, conversationController.getMyConversations);

// Chi tiết cuộc trò chuyện
router.get("/:id", authMiddleware, conversationController.getConversationById);

// Xóa đoạn chat chỉ ở phía người đang đăng nhập
router.delete(
  "/:id",
  authMiddleware,
  conversationController.deleteConversationForMe,
);

module.exports = router;
