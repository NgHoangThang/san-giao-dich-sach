import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import socket from "../socket";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import logoIcon from "../assets/logo-icon.png";

const PALETTE = {
  ink: "#172231",
  rust: "#8F4338",
  brass: "#A98232",
  line: "#E8E0D2",
  muted: "#625E56",
  mutedLight: "#8D867B",
  drawer: "#F8F4EC",
};

const FONT_SERIF = "'Fraunces', serif";
const FONT_SANS = "'DM Sans', ui-sans-serif, system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

// Icon hiển thị cho từng loại thông báo — phải khớp với các giá trị
// "type" mà backend gửi trong models/Notification.js
const NOTIFICATION_ICONS = {
  order_created: "🛒",
  order_accepted: "✅",
  order_preparing: "📦",
  order_shipping: "🚚",
  order_shipping_update: "🚚",
  order_delivered: "📬",
  order_completed: "🎉",
  order_canceled: "❌",
  review_created: "⭐",
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [exploreOpen, setExploreOpen] = useState(false);
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false);

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const currentUserId = user?._id || user?.id || user?.userId;

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  // ======================================================
  // KIỂM TRA ADMIN
  // ======================================================
  const isAdmin = user?.role === "admin";

  // ======================================================
  // LẤY SỐ TIN NHẮN CHƯA ĐỌC
  // ======================================================
  const loadUnreadMessageCount = useCallback(async () => {
    if (!currentUserId) {
      setUnreadMessageCount(0);
      return;
    }

    try {
      const response = await api.get("/api/messages/unread/count");

      setUnreadMessageCount(Number(response.data?.unreadCount || 0));
    } catch (error) {
      console.error("Lỗi lấy số tin nhắn chưa đọc:", error);

      setUnreadMessageCount(0);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadUnreadMessageCount();
  }, [loadUnreadMessageCount]);

  // ======================================================
  // LẤY DANH SÁCH THÔNG BÁO
  // ======================================================
  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    try {
      setNotificationLoading(true);

      const response = await api.get("/api/notifications");

      setNotifications(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Lỗi lấy thông báo:", error);
    } finally {
      setNotificationLoading(false);
    }
  }, [user]);

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
      console.log("Navbar Socket đã kết nối:", socket.id);

      socket.emit("register_notification", String(currentUserId));
    };

    const handleNewNotification = (newNotification) => {
      setNotifications((previousNotifications) => {
        const existed = previousNotifications.some(
          (notification) =>
            String(notification._id) === String(newNotification._id),
        );

        if (existed) {
          return previousNotifications;
        }

        return [newNotification, ...previousNotifications];
      });
    };

    const refreshMessageBadge = () => {
      loadUnreadMessageCount();
    };

    const handleConnectError = (error) => {
      console.error("Lỗi kết nối Socket.IO:", error.message);
    };

    socket.on("connect", handleConnect);

    socket.on("new_notification", handleNewNotification);

    socket.on("message_unread", refreshMessageBadge);

    socket.on("unread_count_updated", refreshMessageBadge);

    socket.on("connect_error", handleConnectError);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);

      socket.off("new_notification", handleNewNotification);

      socket.off("message_unread", refreshMessageBadge);

      socket.off("unread_count_updated", refreshMessageBadge);

      socket.off("connect_error", handleConnectError);
    };
  }, [currentUserId, loadUnreadMessageCount]);

  // ======================================================
  // MỞ / ĐÓNG THÔNG BÁO
  // ======================================================
  const handleOpenNotifications = async () => {
    const willOpen = !notificationOpen;

    setNotificationOpen(willOpen);
    setMenuOpen(false);
    setExploreOpen(false);

    if (willOpen) {
      await loadNotifications();
    }
  };

  // ======================================================
  // ĐÁNH DẤU TẤT CẢ THÔNG BÁO ĐÃ ĐỌC
  // ======================================================
  const handleMarkAllNotificationsAsRead = async () => {
    if (unreadCount === 0) {
      return;
    }

    try {
      await api.put("/api/notifications/mark-all-read");

      setNotifications((previousNotifications) =>
        previousNotifications.map((notification) => ({
          ...notification,
          isRead: true,
        })),
      );
    } catch (error) {
      console.error("Lỗi đánh dấu thông báo:", error);

      alert(
        error.response?.data?.message || "Không thể đánh dấu thông báo đã đọc.",
      );
    }
  };

  // ======================================================
  // CLICK THÔNG BÁO
  // ======================================================
  const handleNotificationClick = (notification) => {
    setNotificationOpen(false);

    if (
      notification.type === "order_created" ||
      notification.type === "order_accepted" ||
      notification.type === "order_preparing" ||
      notification.type === "order_shipping" ||
      notification.type === "order_shipping_update" ||
      notification.type === "order_delivered" ||
      notification.type === "order_completed" ||
      notification.type === "order_canceled" ||
      notification.type === "review_created"
    ) {
      navigate("/orders");
    }
  };

  // ======================================================
  // ĐĂNG XUẤT
  // ======================================================
  const handleLogout = () => {
    setMenuOpen(false);
    setMobileNavOpen(false);
    setExploreOpen(false);
    setMobileExploreOpen(false);
    setNotificationOpen(false);

    setNotifications([]);
    setUnreadMessageCount(0);

    if (socket.connected) {
      socket.disconnect();
    }

    logout();

    navigate("/login");
  };

  // ======================================================
  // FORMAT THỜI GIAN
  // ======================================================
  const formatNotificationTime = (createdAt) => {
    if (!createdAt) {
      return "";
    }

    return new Date(createdAt).toLocaleString("vi-VN");
  };

  return (
    <nav
      className="sticky top-0 z-50 border-b backdrop-blur-xl"
      style={{
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.96) 0%, rgba(252,249,242,0.96) 52%, rgba(255,255,255,0.96) 100%)",
        borderColor: PALETTE.line,
        boxShadow: "0 8px 30px rgba(23, 34, 49, 0.055)",
      }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,600;1,9..144,500&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        `}
      </style>

      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-[72px] items-center justify-between gap-4">
          {/* ==================================================
              LOGO
          ================================================== */}
          <Link
            to="/"
            className="group flex shrink-0 items-center gap-3 rounded-2xl py-1.5 pr-2 transition hover:opacity-90"
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-white shadow-sm transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md"
              style={{ borderColor: PALETTE.line }}
            >
              <img
                src={logoIcon}
                alt="Sách SV"
                className="h-8 w-auto shrink-0"
              />
            </div>

            <span
              className="hidden text-[20px] leading-none sm:block"
              style={{
                fontFamily: FONT_SERIF,
                fontWeight: 600,
                color: PALETTE.ink,
              }}
            >
              Sách{" "}
              <span
                style={{
                  color: PALETTE.brass,
                  fontStyle: "italic",
                }}
              >
                SV
              </span>
            </span>
          </Link>

          {/* ==================================================
              MENU DESKTOP
          ================================================== */}
          <div
            className="hidden items-center gap-1 whitespace-nowrap rounded-full border bg-white/70 p-1.5 shadow-sm lg:flex"
            style={{ borderColor: PALETTE.line }}
          >
            {/* Trang chủ */}
            <Link
              to="/"
              className="rounded-full px-3.5 py-2 text-[13px] font-semibold transition duration-200 hover:bg-[#F6F1E7]"
              style={{
                color: PALETTE.muted,
                fontFamily: FONT_SANS,
              }}
            >
              Trang chủ
            </Link>

            {/* Tất cả sách */}
            <Link
              to="/tat-ca-sach"
              className="rounded-full px-3.5 py-2 text-[13px] font-semibold transition duration-200 hover:bg-[#F6F1E7]"
              style={{
                color: PALETTE.muted,
                fontFamily: FONT_SANS,
              }}
            >
              Tất cả sách
            </Link>

            {/* ==================================================
                CỬA HÀNG - PUBLIC
            ================================================== */}
            <Link
              to="/shop"
              className="group flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold transition duration-200 hover:bg-[#F3EADB]"
              style={{
                color: PALETTE.brass,
                fontFamily: FONT_SANS,
              }}
            >
              <svg
                className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M3 10l1.8-5h14.4L21 10M5 10v9h14v-9M9 19v-5h6v5M3 10c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2"
                />
              </svg>
              <span>Cửa hàng</span>
            </Link>

            {/* ==================================================
                KHÁM PHÁ
            ================================================== */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setExploreOpen((previous) => !previous);

                  setMenuOpen(false);
                  setNotificationOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition duration-200 hover:bg-[#F6F1E7]"
                style={{
                  color: PALETTE.muted,
                  fontFamily: FONT_SANS,
                }}
              >
                Khám phá
                <svg
                  className={`h-3.5 w-3.5 transition-transform ${
                    exploreOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {exploreOpen && (
                <div
                  className="absolute left-0 top-[calc(100%+14px)] z-50 w-72 overflow-hidden rounded-2xl border bg-white/95 py-2 shadow-[0_24px_70px_rgba(23,34,49,0.16)] backdrop-blur-xl"
                  style={{
                    borderColor: PALETTE.line,
                  }}
                >
                  {/* ==========================================
                      SÁCH MỚI ĐĂNG
                      CHỈ ADMIN ĐƯỢC THẤY
                  ========================================== */}
                  {isAdmin && (
                    <Link
                      to="/sach-moi-dang"
                      onClick={() => setExploreOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                        🆕
                      </span>

                      <div>
                        <p
                          className="text-sm font-semibold"
                          style={{
                            color: PALETTE.ink,
                          }}
                        >
                          Sách mới đăng
                        </p>

                        <p className="mt-0.5 text-[11px] text-gray-400">
                          Khu vực dành cho Admin
                        </p>
                      </div>
                    </Link>
                  )}

                  {/* Sách giá tốt */}
                  <Link
                    to="/sach-gia-tot"
                    onClick={() => setExploreOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                      🔥
                    </span>

                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{
                          color: PALETTE.ink,
                        }}
                      >
                        Sách giá tốt
                      </p>

                      <p className="mt-0.5 text-[11px] text-gray-400">
                        Sách phù hợp túi tiền
                      </p>
                    </div>
                  </Link>

                  {/* Giáo trình */}
                  <Link
                    to="/giao-trinh-noi-bat"
                    onClick={() => setExploreOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                      🎓
                    </span>

                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{
                          color: PALETTE.ink,
                        }}
                      >
                        Giáo trình nổi bật
                      </p>

                      <p className="mt-0.5 text-[11px] text-gray-400">
                        Giáo trình sinh viên
                      </p>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* ==================================================
                CHỨC NĂNG NGƯỜI BÁN
                CHỈ ADMIN
            ================================================== */}
            {isAdmin && (
              <>
                <Link
                  to="/create-book"
                  className="rounded-full px-3.5 py-2 text-[13px] font-semibold transition duration-200 hover:bg-[#F6F1E7]"
                  style={{
                    color: PALETTE.muted,
                    fontFamily: FONT_SANS,
                  }}
                >
                  Đăng sách
                </Link>

                <Link
                  to="/my-books"
                  className="rounded-full px-3.5 py-2 text-[13px] font-semibold transition duration-200 hover:bg-[#F6F1E7]"
                  style={{
                    color: PALETTE.muted,
                    fontFamily: FONT_SANS,
                  }}
                >
                  Sách của tôi
                </Link>
              </>
            )}

            {/* ==================================================
                USER + ADMIN
            ================================================== */}
            {user && (
              <>
                <Link
                  to="/orders"
                  className="rounded-full px-3.5 py-2 text-[13px] font-semibold transition duration-200 hover:bg-[#F6F1E7]"
                  style={{
                    color: PALETTE.muted,
                    fontFamily: FONT_SANS,
                  }}
                >
                  Đơn hàng
                </Link>

                <Link
                  to="/chat"
                  className="relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition duration-200 hover:bg-[#F6F1E7]"
                  style={{
                    color: PALETTE.muted,
                    fontFamily: FONT_SANS,
                  }}
                >
                  <span>Tin nhắn</span>

                  {unreadMessageCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
                      {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                    </span>
                  )}
                </Link>
              </>
            )}
          </div>

          {/* ==================================================
              BÊN PHẢI
          ================================================== */}
          <div className="flex items-center gap-2">
            {/* NÚT MOBILE */}
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen((previous) => !previous);

                setMobileExploreOpen(false);

                setExploreOpen(false);
                setMenuOpen(false);

                setNotificationOpen(false);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border bg-white/80 shadow-sm transition hover:bg-[#F8F4EC] lg:hidden"
              style={{ borderColor: PALETTE.line }}
            >
              {mobileNavOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{
                    color: PALETTE.ink,
                  }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{
                    color: PALETTE.ink,
                  }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>

            {user ? (
              <>
                {/* ==============================================
                    CHUÔNG THÔNG BÁO
                ============================================== */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleOpenNotifications}
                    className="relative flex h-10 w-10 items-center justify-center rounded-full border bg-white/80 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#F8F4EC] hover:shadow-md"
                    style={{ borderColor: PALETTE.line }}
                    title="Thông báo"
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{
                        color: PALETTE.ink,
                      }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>

                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#8F4338] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* DROPDOWN THÔNG BÁO */}
                  {notificationOpen && (
                    <div
                      className="absolute right-0 z-50 mt-2 w-[420px] max-w-[95vw] overflow-hidden rounded-2xl border bg-white shadow-2xl"
                      style={{
                        borderColor: PALETTE.line,
                      }}
                    >
                      {/* HEADER */}
                      <div
                        className="border-b bg-white px-4 py-4"
                        style={{
                          borderColor: PALETTE.line,
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3
                              className="text-base font-bold"
                              style={{
                                color: PALETTE.ink,
                              }}
                            >
                              Thông báo
                            </h3>

                            <p className="mt-1 text-xs text-gray-500">
                              {unreadCount > 0
                                ? `${unreadCount} chưa đọc · ${notifications.length} tổng cộng`
                                : `${notifications.length} thông báo · Đã đọc tất cả`}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={loadNotifications}
                            disabled={notificationLoading}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:bg-gray-100 disabled:opacity-50"
                            style={{
                              color: PALETTE.rust,
                            }}
                          >
                            {notificationLoading ? "Đang tải..." : "↻ Làm mới"}
                          </button>
                        </div>

                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllNotificationsAsRead}
                            className="mt-3 w-full rounded-lg py-2 text-xs font-semibold transition hover:opacity-90"
                            style={{
                              backgroundColor: PALETTE.drawer,

                              color: PALETTE.brass,

                              border: `1px solid ${PALETTE.line}`,
                            }}
                          >
                            ✓ Đánh dấu tất cả đã đọc
                          </button>
                        )}
                      </div>

                      {/* DANH SÁCH */}
                      <div className="max-h-[460px] overflow-y-auto">
                        {notificationLoading && notifications.length === 0 ? (
                          <div className="py-10 text-center text-sm text-gray-500">
                            Đang tải thông báo...
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="py-10 text-center">
                            <div className="mb-2 text-4xl">🔔</div>

                            <p className="text-sm text-gray-500">
                              Chưa có thông báo
                            </p>
                          </div>
                        ) : (
                          notifications.slice(0, 5).map((notification) => (
                            <button
                              type="button"
                              key={notification._id}
                              onClick={() =>
                                handleNotificationClick(notification)
                              }
                              className={`w-full border-b px-4 py-3 text-left transition hover:bg-gray-50 ${
                                !notification.isRead ? "bg-red-50" : "bg-white"
                              }`}
                              style={{
                                borderColor: PALETTE.line,
                              }}
                            >
                              <div className="flex gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                                  {NOTIFICATION_ICONS[notification.type] ||
                                    "⭐"}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p
                                      className="text-sm font-semibold"
                                      style={{
                                        color: PALETTE.ink,
                                      }}
                                    >
                                      {notification.title}
                                    </p>

                                    {!notification.isRead && (
                                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                                    )}
                                  </div>

                                  <p className="mt-1 text-sm text-gray-600">
                                    {notification.message}
                                  </p>

                                  <p className="mt-2 text-xs text-gray-400">
                                    {formatNotificationTime(
                                      notification.createdAt,
                                    )}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ==============================================
                    TÀI KHOẢN
                ============================================== */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen((previous) => !previous);

                      setExploreOpen(false);

                      setNotificationOpen(false);
                    }}
                    className="flex items-center gap-2.5 rounded-full border bg-white/85 px-2 py-1.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md sm:pr-3"
                    style={{ borderColor: PALETTE.line }}
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: PALETTE.drawer,

                        border: `1px solid ${PALETTE.line}`,
                      }}
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt="avatar"
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className="text-sm font-semibold"
                          style={{
                            color: PALETTE.ink,

                            fontFamily: FONT_SERIF,
                          }}
                        >
                          {user.fullName?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <span
                      className="hidden max-w-[130px] truncate text-sm font-medium sm:block"
                      style={{
                        color: PALETTE.ink,
                      }}
                    >
                      {user.fullName}
                    </span>

                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{
                        color: PALETTE.mutedLight,
                      }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* ACCOUNT DROPDOWN */}
                  {menuOpen && (
                    <div
                      className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-2xl border bg-white/95 py-2 shadow-[0_24px_70px_rgba(23,34,49,0.16)] backdrop-blur-xl"
                      style={{
                        borderColor: PALETTE.line,
                      }}
                    >
                      {/* USER INFO */}
                      <div
                        className="border-b px-4 py-3"
                        style={{
                          borderColor: PALETTE.line,
                        }}
                      >
                        <p
                          className="truncate text-sm font-semibold"
                          style={{
                            color: PALETTE.ink,
                          }}
                        >
                          {user.fullName}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {isAdmin ? "Tài khoản Admin" : "Tài khoản người dùng"}
                        </p>
                      </div>

                      {/* PROFILE */}
                      <Link
                        to="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm transition hover:bg-gray-50"
                        style={{
                          color: PALETTE.muted,
                        }}
                      >
                        👤 Hồ sơ cá nhân
                      </Link>

                      {/* WISHLIST */}
                      <Link
                        to="/wishlist"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm transition hover:bg-gray-50"
                        style={{
                          color: PALETTE.muted,
                        }}
                      >
                        ❤️ Yêu thích
                      </Link>

                      {/* ======================================
                          KHU VỰC ADMIN
                      ====================================== */}
                      {isAdmin && (
                        <>
                          <hr
                            className="my-2"
                            style={{
                              borderColor: PALETTE.line,
                            }}
                          />

                          <div className="px-4 pb-2 pt-1">
                            <p
                              className="text-[11px] font-bold uppercase tracking-wider"
                              style={{
                                color: PALETTE.mutedLight,

                                fontFamily: FONT_SANS,
                              }}
                            >
                              Khu vực quản trị
                            </p>
                          </div>

                          {/* Dashboard */}
                          <Link
                            to="/admin/dashboard"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-red-50"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                              📊
                            </span>

                            <div>
                              <p
                                className="font-semibold"
                                style={{
                                  color: PALETTE.ink,
                                }}
                              >
                                Dashboard
                              </p>

                              <p className="text-[11px] text-gray-400">
                                Thống kê hệ thống
                              </p>
                            </div>
                          </Link>

                          {/* Quản lý sách */}
                          <Link
                            to="/admin/books"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-green-50"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                              📚
                            </span>

                            <div>
                              <p
                                className="font-semibold"
                                style={{
                                  color: PALETTE.ink,
                                }}
                              >
                                Quản lý sách
                              </p>

                              <p className="text-[11px] text-gray-400">
                                Quản lý toàn bộ kho sách
                              </p>
                            </div>
                          </Link>

                          {/* Quản lý cửa hàng */}
                          <Link
                            to="/admin/shop"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-orange-50"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                              🏪
                            </span>

                            <div>
                              <p
                                className="font-semibold"
                                style={{
                                  color: PALETTE.ink,
                                }}
                              >
                                Quản lý cửa hàng
                              </p>

                              <p className="text-[11px] text-gray-400">
                                Địa chỉ và thông tin shop
                              </p>
                            </div>
                          </Link>

                          {/* Users */}
                          <Link
                            to="/admin/users"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-blue-50"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                              👥
                            </span>

                            <div>
                              <p
                                className="font-semibold"
                                style={{
                                  color: PALETTE.ink,
                                }}
                              >
                                Quản lý người dùng
                              </p>

                              <p className="text-[11px] text-gray-400">
                                Khóa / mở tài khoản
                              </p>
                            </div>
                          </Link>

                          {/* Reports */}
                          <Link
                            to="/admin/reports"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-yellow-50"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-50">
                              🚨
                            </span>

                            <div>
                              <p
                                className="font-semibold"
                                style={{
                                  color: PALETTE.ink,
                                }}
                              >
                                Quản lý tố cáo
                              </p>

                              <p className="text-[11px] text-gray-400">
                                Xử lý báo cáo
                              </p>
                            </div>
                          </Link>

                          {/* Reviews */}
                          <Link
                            to="/admin/reviews"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-yellow-50"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                              ⭐
                            </span>

                            <div>
                              <p
                                className="font-semibold"
                                style={{
                                  color: PALETTE.ink,
                                }}
                              >
                                Quản lý đánh giá
                              </p>

                              <p className="text-[11px] text-gray-400">
                                Kiểm tra đánh giá
                              </p>
                            </div>
                          </Link>
                        </>
                      )}

                      <hr
                        className="my-2"
                        style={{
                          borderColor: PALETTE.line,
                        }}
                      />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full px-4 py-2.5 text-left text-sm transition hover:bg-red-50"
                        style={{
                          color: PALETTE.rust,
                        }}
                      >
                        🚪 Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ================================================
                 CHƯA ĐĂNG NHẬP
              ================================================ */
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-full px-3 py-2 text-sm font-semibold transition hover:bg-[#F8F4EC] sm:px-4"
                  style={{
                    color: PALETTE.muted,
                  }}
                >
                  Đăng nhập
                </Link>

                <Link
                  to="/register"
                  className="rounded-full px-4 py-2.5 text-sm font-semibold shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:px-5"
                  style={{
                    backgroundColor: PALETTE.ink,

                    color: "#fff",
                  }}
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ====================================================
            MOBILE / TABLET MENU
        ==================================================== */}
        {mobileNavOpen && (
          <div
            className="border-t bg-white/95 py-3 backdrop-blur-xl lg:hidden"
            style={{
              borderColor: PALETTE.line,
            }}
          >
            <div className="flex flex-col gap-1">
              {/* Trang chủ */}
              <Link
                to="/"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                style={{
                  color: PALETTE.ink,
                  fontFamily: FONT_SANS,
                }}
              >
                Trang chủ
              </Link>

              {/* Tất cả sách */}
              <Link
                to="/tat-ca-sach"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                style={{
                  color: PALETTE.ink,
                  fontFamily: FONT_SANS,
                }}
              >
                Tất cả sách
              </Link>

              {/* CỬA HÀNG - PUBLIC */}
              <Link
                to="/shop"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-[#F3EADB]"
                style={{
                  color: PALETTE.brass,
                  fontFamily: FONT_SANS,
                }}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M3 10l1.8-5h14.4L21 10M5 10v9h14v-9M9 19v-5h6v5"
                  />
                </svg>
                Cửa hàng
              </Link>

              {/* KHÁM PHÁ MOBILE */}
              <button
                type="button"
                onClick={() => setMobileExploreOpen((previous) => !previous)}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition hover:bg-gray-50"
                style={{
                  color: PALETTE.ink,
                  fontFamily: FONT_SANS,
                }}
              >
                <span>Khám phá</span>

                <svg
                  className={`h-4 w-4 transition-transform ${
                    mobileExploreOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {mobileExploreOpen && (
                <div
                  className="ml-3 flex flex-col gap-1 border-l pl-3"
                  style={{
                    borderColor: PALETTE.line,
                  }}
                >
                  {/* ADMIN ONLY */}
                  {isAdmin && (
                    <Link
                      to="/sach-moi-dang"
                      onClick={() => {
                        setMobileExploreOpen(false);

                        setMobileNavOpen(false);
                      }}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                      style={{
                        color: PALETTE.ink,
                      }}
                    >
                      🆕 Sách mới đăng
                    </Link>
                  )}

                  <Link
                    to="/sach-gia-tot"
                    onClick={() => {
                      setMobileExploreOpen(false);

                      setMobileNavOpen(false);
                    }}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                    style={{
                      color: PALETTE.ink,
                    }}
                  >
                    🔥 Sách giá tốt
                  </Link>

                  <Link
                    to="/giao-trinh-noi-bat"
                    onClick={() => {
                      setMobileExploreOpen(false);

                      setMobileNavOpen(false);
                    }}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                    style={{
                      color: PALETTE.ink,
                    }}
                  >
                    🎓 Giáo trình nổi bật
                  </Link>
                </div>
              )}

              {user && (
                <>
                  <hr
                    className="my-2"
                    style={{
                      borderColor: PALETTE.line,
                    }}
                  />

                  {/* ==========================================
                      ADMIN ONLY
                  ========================================== */}
                  {isAdmin && (
                    <>
                      <Link
                        to="/create-book"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                        style={{
                          color: PALETTE.ink,

                          fontFamily: FONT_SANS,
                        }}
                      >
                        Đăng sách
                      </Link>

                      <Link
                        to="/my-books"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                        style={{
                          color: PALETTE.ink,

                          fontFamily: FONT_SANS,
                        }}
                      >
                        Sách của tôi
                      </Link>
                    </>
                  )}

                  {/* ==========================================
                      USER + ADMIN
                  ========================================== */}
                  <Link
                    to="/orders"
                    onClick={() => setMobileNavOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                    style={{
                      color: PALETTE.ink,

                      fontFamily: FONT_SANS,
                    }}
                  >
                    Đơn hàng
                  </Link>

                  <Link
                    to="/chat"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                    style={{
                      color: PALETTE.ink,

                      fontFamily: FONT_SANS,
                    }}
                  >
                    <span>Tin nhắn</span>

                    {unreadMessageCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
                        {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/profile"
                    onClick={() => setMobileNavOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                    style={{
                      color: PALETTE.ink,

                      fontFamily: FONT_SANS,
                    }}
                  >
                    👤 Hồ sơ cá nhân
                  </Link>

                  <Link
                    to="/wishlist"
                    onClick={() => setMobileNavOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                    style={{
                      color: PALETTE.ink,

                      fontFamily: FONT_SANS,
                    }}
                  >
                    ❤️ Yêu thích
                  </Link>

                  {/* ==========================================
                      MOBILE ADMIN AREA
                  ========================================== */}
                  {isAdmin && (
                    <>
                      <hr
                        className="my-2"
                        style={{
                          borderColor: PALETTE.line,
                        }}
                      />

                      <p
                        className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider"
                        style={{
                          color: PALETTE.mutedLight,

                          fontFamily: FONT_SANS,
                        }}
                      >
                        Khu vực quản trị
                      </p>

                      <Link
                        to="/admin/dashboard"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                        style={{
                          color: PALETTE.ink,

                          fontFamily: FONT_SANS,
                        }}
                      >
                        📊 Dashboard
                      </Link>

                      <Link
                        to="/admin/shop"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                        style={{
                          color: PALETTE.ink,

                          fontFamily: FONT_SANS,
                        }}
                      >
                        🏪 Quản lý cửa hàng
                      </Link>

                      <Link
                        to="/admin/users"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                        style={{
                          color: PALETTE.ink,

                          fontFamily: FONT_SANS,
                        }}
                      >
                        👥 Quản lý người dùng
                      </Link>

                      <Link
                        to="/admin/reports"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                        style={{
                          color: PALETTE.ink,

                          fontFamily: FONT_SANS,
                        }}
                      >
                        🚨 Quản lý tố cáo
                      </Link>

                      <Link
                        to="/admin/reviews"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-gray-50"
                        style={{
                          color: PALETTE.ink,

                          fontFamily: FONT_SANS,
                        }}
                      >
                        ⭐ Quản lý đánh giá
                      </Link>
                    </>
                  )}

                  <hr
                    className="my-2"
                    style={{
                      borderColor: PALETTE.line,
                    }}
                  />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg px-3 py-2.5 text-left text-sm font-medium transition hover:bg-red-50"
                    style={{
                      color: PALETTE.rust,
                    }}
                  >
                    🚪 Đăng xuất
                  </button>
                </>
              )}

              {/* CHƯA LOGIN */}
              {!user && (
                <div className="flex items-center gap-2 px-1 pt-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-medium"
                    style={{
                      color: PALETTE.ink,

                      border: `1px solid ${PALETTE.line}`,
                    }}
                  >
                    Đăng nhập
                  </Link>

                  <Link
                    to="/register"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-medium"
                    style={{
                      backgroundColor: PALETTE.ink,

                      color: "#fff",
                    }}
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(169,130,50,0.18) 20%, rgba(169,130,50,0.55) 50%, rgba(169,130,50,0.18) 80%, transparent 100%)",
        }}
      />
    </nav>
  );
};

export default Navbar;
