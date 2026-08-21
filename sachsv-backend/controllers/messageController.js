const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

// ======================================================
// 1. GỬI TIN NHẮN
// ======================================================
exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { conversationId, content } = req.body;

    if (!conversationId) {
      return res.status(400).json({
        message: "Thiếu mã cuộc trò chuyện",
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Nội dung tin nhắn không được để trống",
      });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        message: "Không tìm thấy cuộc hội thoại",
      });
    }

    const isMember = conversation.participants.some(
      (participantId) => String(participantId) === String(senderId),
    );

    if (!isMember) {
      return res.status(403).json({
        message: "Bạn không thuộc cuộc hội thoại này",
      });
    }

    const message = await Message.create({
      conversationId,
      senderId,
      content: content.trim(),
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
      hiddenFor: [],
    });

    await message.populate("senderId", "fullName avatar");

    const io = req.app.get("io");

    if (io) {
      io.to(String(conversationId)).emit("receive_message", message);

      conversation.participants.forEach((participantId) => {
        io.to(String(participantId)).emit("conversation_updated", {
          conversationId,
          message,
        });
      });

      conversation.participants
        .filter((participantId) => String(participantId) !== String(senderId))
        .forEach((receiverId) => {
          io.to(String(receiverId)).emit("message_unread", {
            conversationId,
            message,
          });
        });
    }

    return res.status(201).json(message);
  } catch (error) {
    console.error("Lỗi sendMessage:", error);

    return res.status(500).json({
      message: "Lỗi server khi gửi tin nhắn",
      error: error.message,
    });
  }
};

// ======================================================
// 2. LẤY TẤT CẢ TIN NHẮN
// ======================================================
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        message: "Không tìm thấy cuộc hội thoại",
      });
    }

    const isMember = conversation.participants.some(
      (participantId) => String(participantId) === String(userId),
    );

    if (!isMember) {
      return res.status(403).json({
        message: "Bạn không thuộc cuộc hội thoại này",
      });
    }

    const isHidden = conversation.hiddenFor?.some(
      (hiddenUserId) => String(hiddenUserId) === String(userId),
    );

    if (isHidden) {
      return res.status(404).json({
        message: "Cuộc trò chuyện này đã được xóa khỏi tài khoản của bạn",
      });
    }

    const messages = await Message.find({
      conversationId,
    })
      .populate("senderId", "fullName avatar")
      .sort({
        createdAt: 1,
      });

    return res.status(200).json(messages);
  } catch (error) {
    console.error("Lỗi getMessages:", error);

    return res.status(500).json({
      message: "Lỗi server khi lấy tin nhắn",
      error: error.message,
    });
  }
};

// ======================================================
// 3. LẤY TỔNG SỐ TIN NHẮN CHƯA ĐỌC
// ======================================================
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await Conversation.find({
      participants: userId,
      hiddenFor: {
        $ne: userId,
      },
    }).select("_id");

    const conversationIds = conversations.map(
      (conversation) => conversation._id,
    );

    if (conversationIds.length === 0) {
      return res.status(200).json({
        unreadCount: 0,
      });
    }

    const unreadCount = await Message.countDocuments({
      conversationId: {
        $in: conversationIds,
      },
      senderId: {
        $ne: userId,
      },
      isRead: false,
    });

    return res.status(200).json({
      unreadCount,
    });
  } catch (error) {
    console.error("Lỗi getUnreadCount:", error);

    return res.status(500).json({
      message: "Lỗi server khi đếm tin nhắn chưa đọc",
      error: error.message,
    });
  }
};

// ======================================================
// 4. ĐÁNH DẤU TIN NHẮN ĐÃ ĐỌC
// ======================================================
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        message: "Không tìm thấy cuộc hội thoại",
      });
    }

    const isMember = conversation.participants.some(
      (participantId) => String(participantId) === String(userId),
    );

    if (!isMember) {
      return res.status(403).json({
        message: "Bạn không thuộc cuộc hội thoại này",
      });
    }

    const result = await Message.updateMany(
      {
        conversationId,
        senderId: {
          $ne: userId,
        },
        isRead: false,
      },
      {
        isRead: true,
      },
    );

    const io = req.app.get("io");

    if (io) {
      io.to(String(userId)).emit("unread_count_updated", {
        conversationId,
        modifiedCount: result.modifiedCount || 0,
      });

      io.to(String(conversationId)).emit("messages_read", {
        conversationId,
        readerId: userId,
      });
    }

    return res.status(200).json({
      message: "Đã đánh dấu đọc",
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    console.error("Lỗi markAsRead:", error);

    return res.status(500).json({
      message: "Lỗi server khi đánh dấu đã đọc",
      error: error.message,
    });
  }
};
