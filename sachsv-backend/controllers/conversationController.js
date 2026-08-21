const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// ======================================================
// 1. TẠO HOẶC LẤY CUỘC TRÒ CHUYỆN
// ======================================================
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { bookId, sellerId } = req.body;
    const buyerId = req.user.userId;

    if (!bookId || !sellerId) {
      return res.status(400).json({
        message: "Thiếu bookId hoặc sellerId",
      });
    }

    if (String(buyerId) === String(sellerId)) {
      return res.status(400).json({
        message: "Không thể tự nhắn tin với chính mình",
      });
    }

    let conversation = await Conversation.findOne({
      bookId,
      participants: {
        $all: [buyerId, sellerId],
      },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        bookId,
        participants: [buyerId, sellerId],
        hiddenFor: [],
      });
    } else {
      await Conversation.findByIdAndUpdate(conversation._id, {
        $pull: {
          hiddenFor: buyerId,
        },
      });

      conversation = await Conversation.findById(conversation._id);
    }

    await conversation.populate("participants", "fullName avatar");

    await conversation.populate("bookId", "title images price");

    await conversation.populate("lastMessage");

    return res.status(200).json(conversation);
  } catch (error) {
    console.error("Lỗi getOrCreateConversation:", error);

    return res.status(500).json({
      message: "Lỗi server khi tạo cuộc trò chuyện",
      error: error.message,
    });
  }
};

// ======================================================
// 2. LẤY DANH SÁCH CUỘC TRÒ CHUYỆN
// ======================================================
exports.getMyConversations = async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await Conversation.find({
      participants: userId,
      hiddenFor: {
        $ne: userId,
      },
    })
      .populate("participants", "fullName avatar")
      .populate("bookId", "title images price")
      .populate("lastMessage")
      .sort({
        updatedAt: -1,
      })
      .lean();

    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conversation._id,
          senderId: {
            $ne: userId,
          },
          isRead: false,
        });

        return {
          ...conversation,
          unreadCount,
        };
      }),
    );

    return res.status(200).json(conversationsWithUnread);
  } catch (error) {
    console.error("Lỗi getMyConversations:", error);

    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách cuộc trò chuyện",
      error: error.message,
    });
  }
};

// ======================================================
// 3. LẤY CHI TIẾT CUỘC TRÒ CHUYỆN
// ======================================================
exports.getConversationById = async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversation = await Conversation.findById(req.params.id)
      .populate("participants", "fullName avatar university phoneNumber")
      .populate("bookId", "title images price condition")
      .populate("lastMessage");

    if (!conversation) {
      return res.status(404).json({
        message: "Không tìm thấy cuộc hội thoại",
      });
    }

    const isMember = conversation.participants.some(
      (participant) => String(participant._id) === String(userId),
    );

    if (!isMember) {
      return res.status(403).json({
        message: "Bạn không có quyền xem cuộc hội thoại này",
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

    return res.status(200).json(conversation);
  } catch (error) {
    console.error("Lỗi getConversationById:", error);

    return res.status(500).json({
      message: "Lỗi server khi lấy cuộc trò chuyện",
      error: error.message,
    });
  }
};

// ======================================================
// 4. XÓA ĐOẠN CHAT Ở PHÍA NGƯỜI ĐANG ĐĂNG NHẬP
// ======================================================
exports.deleteConversationForMe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const conversationId = req.params.id;

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
        message: "Bạn không có quyền xóa cuộc hội thoại này",
      });
    }

    await Conversation.findByIdAndUpdate(conversationId, {
      $addToSet: {
        hiddenFor: userId,
      },
    });

    const io = req.app.get("io");

    if (io) {
      io.to(String(userId)).emit("unread_count_updated", {
        conversationId,
      });
    }

    return res.status(200).json({
      message: "Đã xóa cuộc trò chuyện khỏi tài khoản của bạn",
    });
  } catch (error) {
    console.error("Lỗi deleteConversationForMe:", error);

    return res.status(500).json({
      message: "Lỗi server khi xóa cuộc trò chuyện",
      error: error.message,
    });
  }
};
