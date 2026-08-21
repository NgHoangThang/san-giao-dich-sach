import React, { useCallback, useEffect, useRef, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import socket from "../socket";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const Chat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentUserId = String(user?._id || user?.id || user?.userId || "");

  const messagesEndRef = useRef(null);

  const selectedConversationIdRef = useRef(conversationId || "");

  const [conversations, setConversations] = useState([]);

  const [selectedConversation, setSelectedConversation] = useState(null);

  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");

  const [conversationLoading, setConversationLoading] = useState(true);

  const [messageLoading, setMessageLoading] = useState(false);

  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [chatMenuOpen, setChatMenuOpen] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    selectedConversationIdRef.current = conversationId || "";

    setChatMenuOpen(false);
  }, [conversationId]);

  // ======================================================
  // DANH SÁCH CUỘC TRÒ CHUYỆN
  // ======================================================
  const loadConversations = useCallback(async () => {
    try {
      setConversationLoading(true);

      const response = await api.get("/api/conversations");

      setConversations(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Lỗi lấy danh sách hội thoại:", err);

      setError(
        err.response?.data?.message ||
          "Không thể tải danh sách cuộc trò chuyện.",
      );
    } finally {
      setConversationLoading(false);
    }
  }, []);

  // ======================================================
  // CHI TIẾT CUỘC TRÒ CHUYỆN
  // ======================================================
  const loadConversation = useCallback(async (id) => {
    if (!id) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }

    try {
      setMessageLoading(true);
      setError("");

      const [conversationResponse, messagesResponse] = await Promise.all([
        api.get(`/api/conversations/${id}`),
        api.get(`/api/messages/${id}`),
      ]);

      setSelectedConversation(conversationResponse.data);

      setMessages(
        Array.isArray(messagesResponse.data) ? messagesResponse.data : [],
      );

      try {
        await api.patch(`/api/messages/${id}/read`);
      } catch (readError) {
        console.error("Không thể đánh dấu đã đọc:", readError);
      }
    } catch (err) {
      console.error("Lỗi tải cuộc trò chuyện:", err);

      setSelectedConversation(null);
      setMessages([]);

      setError(err.response?.data?.message || "Không thể tải cuộc trò chuyện.");
    } finally {
      setMessageLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    loadConversation(conversationId);
  }, [conversationId, loadConversation]);

  // ======================================================
  // SOCKET.IO
  // ======================================================
  useEffect(() => {
    if (!currentUserId) {
      return undefined;
    }

    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => {
      console.log("Chat Socket đã kết nối:", socket.id);

      socket.emit("register_notification", currentUserId);
    };

    const handleReceiveMessage = (newMessage) => {
      const incomingConversationId = String(
        newMessage.conversationId?._id || newMessage.conversationId || "",
      );

      if (incomingConversationId === selectedConversationIdRef.current) {
        setMessages((previousMessages) => {
          const existed = previousMessages.some(
            (message) => String(message._id) === String(newMessage._id),
          );

          if (existed) {
            return previousMessages;
          }

          return [...previousMessages, newMessage];
        });

        // Đang mở đúng phòng chat nên đánh dấu tin mới là đã đọc.
        api
          .patch(`/api/messages/${incomingConversationId}/read`)
          .catch((readError) => {
            console.error("Không thể đánh dấu tin nhắn đã đọc:", readError);
          });
      }

      loadConversations();
    };

    const handleConversationUpdated = () => {
      loadConversations();
    };

    const handleUnreadCountUpdated = () => {
      loadConversations();
    };

    const handleConnectError = (socketError) => {
      console.error("Lỗi kết nối Socket:", socketError.message);
    };

    socket.on("connect", handleConnect);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("conversation_updated", handleConversationUpdated);
    socket.on("unread_count_updated", handleUnreadCountUpdated);
    socket.on("connect_error", handleConnectError);

    // Socket có thể đã được Navbar kết nối trước khi mở trang Chat.
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("conversation_updated", handleConversationUpdated);
      socket.off("unread_count_updated", handleUnreadCountUpdated);
      socket.off("connect_error", handleConnectError);
    };
  }, [currentUserId, loadConversations]);

  // ======================================================
  // VÀO PHÒNG CHAT KHI CHUYỂN HỘI THOẠI
  // ======================================================
  useEffect(() => {
    if (!conversationId) {
      return undefined;
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("join_conversation", conversationId);

    return () => {
      socket.emit("leave_conversation", conversationId);
    };
  }, [conversationId]);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // ======================================================
  // GỬI TIN NHẮN
  // ======================================================
  const handleSendMessage = async (event) => {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent || !conversationId || sending) {
      return;
    }

    try {
      setSending(true);

      const response = await api.post("/api/messages", {
        conversationId,
        content: trimmedContent,
      });

      const sentMessage = response.data;

      setMessages((previousMessages) => {
        const existed = previousMessages.some(
          (message) => String(message._id) === String(sentMessage._id),
        );

        if (existed) {
          return previousMessages;
        }

        return [...previousMessages, sentMessage];
      });

      setContent("");
      await loadConversations();
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);

      alert(err.response?.data?.message || "Không thể gửi tin nhắn.");
    } finally {
      setSending(false);
    }
  };

  // ======================================================
  // XÓA ĐOẠN CHAT
  // ======================================================
  const handleDeleteConversation = async () => {
    if (!conversationId || deleting) {
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa cuộc trò chuyện này?\n\n" +
        "Cuộc trò chuyện chỉ bị xóa khỏi tài khoản của bạn. " +
        "Người kia vẫn xem được tin nhắn.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setChatMenuOpen(false);

      await api.delete(`/api/conversations/${conversationId}`);

      setConversations((previousConversations) =>
        previousConversations.filter(
          (conversation) => String(conversation._id) !== String(conversationId),
        ),
      );

      setSelectedConversation(null);
      setMessages([]);
      setContent("");

      navigate("/chat");
    } catch (deleteError) {
      console.error("Lỗi xóa đoạn chat:", deleteError);

      alert(
        deleteError.response?.data?.message || "Không thể xóa cuộc trò chuyện.",
      );
    } finally {
      setDeleting(false);
    }
  };

  // ======================================================
  // CÁC HÀM HỖ TRỢ
  // ======================================================
  const getOtherParticipant = (conversation) => {
    if (!conversation?.participants) {
      return null;
    }

    return conversation.participants.find(
      (participant) =>
        String(participant?._id || participant) !== currentUserId,
    );
  };

  const getBookImage = (conversation) => {
    return (
      conversation?.bookId?.images?.[0] ||
      "https://via.placeholder.com/100x130?text=Sach"
    );
  };

  const formatTime = (date) => {
    if (!date) {
      return "";
    }

    return new Date(date).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  };

  const selectedOtherUser = getOtherParticipant(selectedConversation);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F3F1EB] py-5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] min-h-[720px]">
            {/* DANH SÁCH CHAT */}
            <aside className="border-r border-gray-200">
              <div className="px-5 py-4 border-b border-gray-200">
                <h1 className="text-xl font-bold text-gray-900">Tin nhắn</h1>

                <p className="text-sm text-gray-500 mt-1">
                  Trao đổi với người mua và người bán.
                </p>
              </div>

              <div className="max-h-[650px] overflow-y-auto">
                {conversationLoading ? (
                  <div className="py-12 text-center text-sm text-gray-500">
                    Đang tải cuộc trò chuyện...
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="py-14 px-6 text-center">
                    <div className="text-5xl mb-3">💬</div>

                    <p className="font-semibold text-gray-700">
                      Chưa có cuộc trò chuyện
                    </p>

                    <p className="text-sm text-gray-500 mt-2">
                      Mở chi tiết sách và nhấn Nhắn tin.
                    </p>
                  </div>
                ) : (
                  conversations.map((conversation) => {
                    const otherUser = getOtherParticipant(conversation);

                    const isSelected =
                      String(conversation._id) === String(conversationId);

                    return (
                      <button
                        type="button"
                        key={conversation._id}
                        onClick={() => navigate(`/chat/${conversation._id}`)}
                        className={`w-full text-left p-4 border-b hover:bg-gray-50 ${
                          isSelected ? "bg-red-50" : "bg-white"
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="relative shrink-0">
                            {otherUser?.avatar ? (
                              <img
                                src={otherUser.avatar}
                                alt="Avatar"
                                className="w-11 h-11 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center font-bold">
                                {otherUser?.fullName?.charAt(0).toUpperCase() ||
                                  "U"}
                              </div>
                            )}

                            <img
                              src={getBookImage(conversation)}
                              alt="Sách"
                              className="absolute -bottom-1 -right-1 w-6 h-6 rounded border-2 border-white object-cover"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between gap-2">
                              <p className="font-semibold text-sm truncate">
                                {otherUser?.fullName || "Người dùng"}
                              </p>

                              <span className="text-[10px] text-gray-400">
                                {formatTime(
                                  conversation.lastMessage?.createdAt ||
                                    conversation.updatedAt,
                                )}
                              </span>
                            </div>

                            <p className="text-xs text-red-600 truncate">
                              {conversation.bookId?.title || "Sách"}
                            </p>

                            <div className="flex items-center gap-2 mt-1">
                              <p
                                className={`text-sm truncate flex-1 ${
                                  conversation.unreadCount > 0
                                    ? "font-semibold text-gray-900"
                                    : "text-gray-500"
                                }`}
                              >
                                {conversation.lastMessage?.content ||
                                  "Chưa có tin nhắn"}
                              </p>

                              {conversation.unreadCount > 0 && (
                                <span className="min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
                                  {conversation.unreadCount > 99
                                    ? "99+"
                                    : conversation.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* KHUNG CHAT */}
            <section className="flex flex-col min-w-0">
              {!conversationId ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <div className="text-7xl mb-5">📚</div>

                    <h2 className="text-xl font-bold">
                      Chọn một cuộc trò chuyện
                    </h2>
                  </div>
                </div>
              ) : messageLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  Đang tải tin nhắn...
                </div>
              ) : !selectedConversation ? (
                <div className="flex-1 flex items-center justify-center">
                  Không thể mở cuộc trò chuyện
                </div>
              ) : (
                <>
                  {/* HEADER */}
                  <div className="px-5 py-4 border-b flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedOtherUser?.avatar ? (
                        <img
                          src={selectedOtherUser.avatar}
                          alt="Avatar"
                          className="w-11 h-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center font-bold">
                          {selectedOtherUser?.fullName
                            ?.charAt(0)
                            .toUpperCase() || "U"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h2 className="font-bold truncate">
                          {selectedOtherUser?.fullName || "Người dùng"}
                        </h2>

                        <p className="text-xs text-gray-500 truncate">
                          {selectedOtherUser?.university ||
                            "Chưa cập nhật trường"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/books/${selectedConversation.bookId?._id}`)
                        }
                        className="hidden sm:flex items-center gap-2 px-3 py-2 border rounded-lg"
                      >
                        <img
                          src={getBookImage(selectedConversation)}
                          alt="Sách"
                          className="w-8 h-10 object-cover rounded"
                        />

                        <span className="max-w-[160px] truncate text-sm">
                          {selectedConversation.bookId?.title || "Sách"}
                        </span>
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setChatMenuOpen(!chatMenuOpen)}
                          className="w-10 h-10 rounded-full border hover:bg-gray-100 text-xl font-bold"
                        >
                          ⋮
                        </button>

                        {chatMenuOpen && (
                          <div className="absolute right-0 mt-2 w-52 bg-white border rounded-lg shadow-lg py-1 z-50">
                            <button
                              type="button"
                              onClick={handleDeleteConversation}
                              disabled={deleting}
                              className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deleting ? "Đang xóa..." : "🗑️ Xóa đoạn chat"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="m-4 p-3 bg-red-50 text-red-700 rounded-lg">
                      {error}
                    </div>
                  )}

                  {/* TIN NHẮN */}
                  <div className="flex-1 overflow-y-auto p-5 bg-[#FAFAF8] max-h-[555px]">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        Chưa có tin nhắn
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((message) => {
                          const senderId = String(
                            message.senderId?._id || message.senderId || "",
                          );

                          const isMine = senderId === currentUserId;

                          return (
                            <div
                              key={message._id}
                              className={`flex ${
                                isMine ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                                  isMine
                                    ? "bg-[#C92127] text-white"
                                    : "bg-white border"
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {message.content}
                                </p>

                                <p className="text-[10px] mt-1 opacity-70">
                                  {formatTime(message.createdAt)}
                                </p>
                              </div>
                            </div>
                          );
                        })}

                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* GỬI TIN NHẮN */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-4 border-t bg-white"
                  >
                    <div className="flex gap-3">
                      <textarea
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            handleSendMessage(event);
                          }
                        }}
                        placeholder="Nhập tin nhắn..."
                        rows={1}
                        maxLength={2000}
                        className="flex-1 resize-none border rounded-xl px-4 py-3"
                      />

                      <button
                        type="submit"
                        disabled={sending || !content.trim()}
                        className="px-5 bg-[#C92127] text-white rounded-xl disabled:opacity-50"
                      >
                        {sending ? "Đang gửi..." : "Gửi"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
