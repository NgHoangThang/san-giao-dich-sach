import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import api from "../../services/api";
import socket from "../../socket";

// ======================================================
// BẢNG MÀU — đồng bộ với SellerProfile / các trang quản trị khác
// ======================================================
const C = {
  ink: "#1C2B39",
  paper: "#FBF7EE",
  card: "#FFFFFF",
  line: "#E3DCC8",
  rust: "#A8493C",
  brass: "#B8872E",
  moss: "#4B6E58",
  muted: "#6B6357",
};

const DISPLAY_FONT = "'Fraunces', Georgia, serif";
const DATA_FONT = "'Space Grotesk', 'Courier New', monospace";

// Nhãn + màu cho từng loại sự kiện trực tiếp
const ACTIVITY_META = {
  order_created: { label: "Đơn mới", color: C.brass },
  order_completed: { label: "Hoàn thành", color: C.moss },
  order_cancelled: { label: "Đã hủy", color: C.muted },
  report_created: { label: "Tố cáo", color: C.rust },
};

// ======================================================
// ICON
// ======================================================
const DashboardIcon = ({ type }) => {
  const commonClass = "w-6 h-6";

  if (type === "users") {
    return (
      <svg
        className={commonClass}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
        />

        <circle cx="9" cy="7" r="4" strokeWidth="1.8" />

        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
        />
      </svg>
    );
  }

  if (type === "books") {
    return (
      <svg
        className={commonClass}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M4 19.5A2.5 2.5 0 016.5 17H20"
        />

        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"
        />
      </svg>
    );
  }

  if (type === "orders") {
    return (
      <svg
        className={commonClass}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M9 11l3 3L22 4"
        />

        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
        />
      </svg>
    );
  }

  return (
    <svg
      className={commonClass}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="9" strokeWidth="1.8" />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M16 8h-6a2 2 0 000 4h4a2 2 0 010 4H8M12 6v12"
      />
    </svg>
  );
};

// ======================================================
// TOOLTIP BIỂU ĐỒ
// ======================================================
const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const revenue = Number(payload[0]?.value || 0);

  return (
    <div
      className="rounded-xl shadow-xl px-4 py-3 border"
      style={{ backgroundColor: C.card, borderColor: C.line }}
    >
      <p className="text-sm font-semibold" style={{ color: C.ink }}>
        {label}
      </p>

      <p className="text-xs mt-1" style={{ color: C.muted }}>
        Doanh thu
      </p>

      <p
        className="text-base font-bold mt-1"
        style={{ color: C.rust, fontFamily: DATA_FONT }}
      >
        {revenue.toLocaleString("vi-VN")}đ
      </p>
    </div>
  );
};

const Dashboard = () => {
  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    totalBooks: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });

  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---- Tính năng công nghệ: theo dõi trực tiếp qua Socket.io ----
  const [liveConnected, setLiveConnected] = useState(false);
  const [activityFeed, setActivityFeed] = useState([]);
  const [pulseKey, setPulseKey] = useState("");
  const pulseTimeoutRef = useRef(null);

  // ======================================================
  // LẤY DỮ LIỆU DASHBOARD (LẦN ĐẦU)
  // ======================================================
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/api/admin/dashboard");

        const data = response.data || {};
        const stats = data.statistics || data.stats || data;

        setStatistics({
          totalUsers: Number(
            stats.totalUsers || stats.users || stats.userCount || 0,
          ),

          totalBooks: Number(
            stats.totalBooks || stats.books || stats.bookCount || 0,
          ),

          totalOrders: Number(
            stats.totalOrders || stats.orders || stats.orderCount || 0,
          ),

          totalRevenue: Number(stats.totalRevenue || stats.revenue || 0),
        });

        const revenueData =
          data.monthlyRevenue || data.revenueByMonth || data.chartData || [];

        const normalizedRevenue = Array.isArray(revenueData)
          ? revenueData.map((item, index) => {
              const rawMonth = item.month ?? item.name ?? item._id ?? index + 1;

              let monthLabel = rawMonth;

              if (
                typeof rawMonth === "number" ||
                /^\d+$/.test(String(rawMonth))
              ) {
                monthLabel = `Tháng ${rawMonth}`;
              }

              if (typeof rawMonth === "object" && rawMonth !== null) {
                monthLabel = rawMonth.month
                  ? `Tháng ${rawMonth.month}`
                  : `Tháng ${index + 1}`;
              }

              return {
                month: monthLabel,
                revenue: Number(
                  item.revenue ||
                    item.totalRevenue ||
                    item.total ||
                    item.value ||
                    0,
                ),
              };
            })
          : [];

        setMonthlyRevenue(normalizedRevenue);
        setLastUpdated(new Date());
      } catch (requestError) {
        console.error("Lỗi lấy dữ liệu Admin Dashboard:", requestError);

        setError(
          requestError.response?.data?.message ||
            "Không thể tải dữ liệu thống kê.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // ======================================================
  // THEO DÕI TRỰC TIẾP QUA SOCKET.IO
  // ======================================================
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const joinAdminRoom = () => {
      socket.emit("join_admin_room");
      setLiveConnected(true);
    };

    const flash = (key) => {
      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
      }

      setPulseKey(key);

      pulseTimeoutRef.current = setTimeout(() => setPulseKey(""), 900);
    };

    const handleActivity = (event) => {
      if (!event || !event.type) {
        return;
      }

      setActivityFeed((previous) =>
        [
          {
            ...event,
            _feedId: `${event.type}-${event.at}-${Math.random()
              .toString(36)
              .slice(2, 7)}`,
          },
          ...previous,
        ].slice(0, 8),
      );

      setLastUpdated(new Date());

      if (event.type === "order_created") {
        flash("totalOrders");

        setStatistics((previous) => ({
          ...previous,
          totalOrders: previous.totalOrders + 1,
        }));
      }

      if (event.type === "order_completed") {
        flash("totalRevenue");

        setStatistics((previous) => ({
          ...previous,
          totalRevenue: previous.totalRevenue + Number(event.amount || 0),
        }));
      }
    };

    const handleDisconnect = () => setLiveConnected(false);

    if (socket.connected) {
      joinAdminRoom();
    }

    socket.on("connect", joinAdminRoom);
    socket.on("admin_activity", handleActivity);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", joinAdminRoom);
      socket.off("admin_activity", handleActivity);
      socket.off("disconnect", handleDisconnect);

      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
      }
    };
  }, []);

  // ======================================================
  // DỮ LIỆU TÍNH TOÁN
  // ======================================================
  const dashboardAnalysis = useMemo(() => {
    const averageBooksPerUser =
      statistics.totalUsers > 0
        ? statistics.totalBooks / statistics.totalUsers
        : 0;

    const averageOrdersPerUser =
      statistics.totalUsers > 0
        ? statistics.totalOrders / statistics.totalUsers
        : 0;

    const averageRevenuePerOrder =
      statistics.totalOrders > 0
        ? statistics.totalRevenue / statistics.totalOrders
        : 0;

    const highestMonth = monthlyRevenue.reduce((highest, current) => {
      if (!highest || current.revenue > highest.revenue) {
        return current;
      }

      return highest;
    }, null);

    const latestMonth =
      monthlyRevenue.length > 0
        ? monthlyRevenue[monthlyRevenue.length - 1]
        : null;

    return {
      averageBooksPerUser,
      averageOrdersPerUser,
      averageRevenuePerOrder,
      highestMonth,
      latestMonth,
    };
  }, [monthlyRevenue, statistics]);

  // ======================================================
  // ĐỊNH DẠNG
  // ======================================================
  const formatCurrency = (value) => {
    return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
  };

  const formatDecimal = (value) => {
    return Number(value || 0).toLocaleString("vi-VN", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  };

  const timeAgo = (isoDate) => {
    const seconds = Math.floor(
      (Date.now() - new Date(isoDate).getTime()) / 1000,
    );

    if (seconds < 60) return "Vừa xong";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    return `${Math.floor(seconds / 3600)} giờ trước`;
  };

  // ======================================================
  // THẺ THỐNG KÊ
  // ======================================================
  const statisticCards = [
    {
      key: "totalUsers",
      title: "Tổng người dùng",
      value: statistics.totalUsers.toLocaleString("vi-VN"),
      description: "Tài khoản trong hệ thống",
      type: "users",
    },
    {
      key: "totalBooks",
      title: "Tổng số sách",
      value: statistics.totalBooks.toLocaleString("vi-VN"),
      description: "Sách đã được đăng tải",
      type: "books",
    },
    {
      key: "totalOrders",
      title: "Tổng đơn hàng",
      value: statistics.totalOrders.toLocaleString("vi-VN"),
      description: "Giao dịch được tạo",
      type: "orders",
    },
    {
      key: "totalRevenue",
      title: "Tổng doanh thu",
      value: formatCurrency(statistics.totalRevenue),
      description: "Từ giao dịch hoàn thành",
      type: "revenue",
      accent: true,
    },
  ];

  // ======================================================
  // LOADING
  // ======================================================
  if (loading) {
    return (
      <div className="min-h-screen py-8" style={{ backgroundColor: C.paper }}>
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 animate-pulse">
          <div
            className="h-40 rounded-2xl"
            style={{ backgroundColor: C.line }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-32 rounded-2xl border"
                style={{ backgroundColor: C.card, borderColor: C.line }}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
            <div
              className="xl:col-span-2 h-[400px] rounded-2xl"
              style={{ backgroundColor: C.card }}
            />
            <div
              className="h-[400px] rounded-2xl"
              style={{ backgroundColor: C.card }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ======================================================
  // LỖI
  // ======================================================
  if (error) {
    return (
      <div
        className="min-h-[75vh] flex items-center justify-center px-4"
        style={{ backgroundColor: C.paper }}
      >
        <div
          className="max-w-md w-full rounded-2xl border shadow-sm p-8 text-center"
          style={{ backgroundColor: C.card, borderColor: C.line }}
        >
          <div className="w-16 h-16 text-4xl rounded-full flex items-center justify-center mx-auto bg-red-50">
            ⚠️
          </div>

          <h2
            className="text-xl font-bold mt-5"
            style={{ color: C.ink, fontFamily: DISPLAY_FONT }}
          >
            Không thể tải Dashboard
          </h2>

          <p className="mt-2 leading-relaxed" style={{ color: C.muted }}>
            {error}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 w-full px-5 py-3 text-white font-semibold rounded-xl transition-opacity hover:opacity-90"
            style={{ backgroundColor: C.rust }}
          >
            Tải lại dữ liệu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-6 sm:py-8"
      style={{ backgroundColor: C.paper }}
    >
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6">
        {/* ======================================================
            DẢI TIÊU ĐỀ — kiểu thẻ định danh, đồng bộ SellerProfile
        ====================================================== */}
        <section
          className="relative overflow-hidden rounded-2xl shadow-sm"
          style={{ backgroundColor: C.ink }}
        >
          <div className="absolute inset-0 opacity-[0.06]">
            <div className="absolute w-72 h-72 bg-white rounded-full -top-32 -right-16" />
            <div className="absolute w-48 h-48 bg-white rounded-full -bottom-24 left-1/3" />
          </div>

          <div className="relative px-6 sm:px-9 py-7 sm:py-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <span
                className="text-xs tracking-[0.2em] uppercase text-white/60"
                style={{ fontFamily: DATA_FONT }}
              >
                Trung tâm quản trị · Sách SV
              </span>

              <h1
                className="text-3xl sm:text-4xl font-semibold text-white mt-2"
                style={{ fontFamily: DISPLAY_FONT }}
              >
                Bảng điều khiển
              </h1>

              <div className="flex items-center gap-2 mt-3">
                <span className="relative flex h-2 w-2">
                  {liveConnected && (
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70"
                      style={{
                        backgroundColor: liveConnected ? C.moss : C.muted,
                      }}
                    />
                  )}

                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{
                      backgroundColor: liveConnected ? "#6FCF97" : "#9CA3AF",
                    }}
                  />
                </span>

                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{
                    color: liveConnected ? "#8FE3B0" : "rgba(255,255,255,0.5)",
                    fontFamily: DATA_FONT,
                  }}
                >
                  {liveConnected ? "Trực tiếp" : "Đang kết nối..."}
                </span>
              </div>
            </div>

            <div
              className="rounded-2xl px-6 py-5 min-w-[220px] border"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <p className="text-xs text-white/50">Cập nhật gần nhất</p>

              <p
                className="text-lg font-bold text-white mt-2"
                style={{ fontFamily: DATA_FONT }}
              >
                {lastUpdated
                  ? lastUpdated.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "--:--:--"}
              </p>

              <p className="text-xs text-white/50 mt-1">
                {lastUpdated ? lastUpdated.toLocaleDateString("vi-VN") : ""}
              </p>
            </div>
          </div>
        </section>

        {/* ======================================================
            ĐIỀU HƯỚNG QUẢN TRỊ
        ====================================================== */}
        <nav
          className="flex flex-wrap gap-2 mt-5 border-b"
          style={{ borderColor: C.line }}
        >
          {[
            { to: "/admin", label: "📊 Tổng quan", end: true },
            { to: "/admin/users", label: "👥 Người dùng" },
            { to: "/admin/reports", label: "🚩 Tố cáo" },
          ].map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  isActive
                    ? "border-current"
                    : "border-transparent hover:bg-white/60"
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? C.rust : C.muted,
              })}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        {/* ======================================================
            THẺ THỐNG KÊ
        ====================================================== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">
          {statisticCards.map((card) => {
            const isPulsing = pulseKey === card.key;

            return (
              <article
                key={card.key}
                className="relative overflow-hidden rounded-2xl border shadow-sm transition-all duration-300"
                style={{
                  backgroundColor: C.card,
                  borderColor: isPulsing ? C.moss : C.line,
                  boxShadow: isPulsing
                    ? `0 0 0 3px rgba(75, 110, 88, 0.15)`
                    : undefined,
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: card.accent ? C.rust : C.brass }}
                />

                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: C.muted }}
                      >
                        {card.title}
                      </p>

                      <p
                        className="text-2xl sm:text-3xl font-bold mt-3 break-words transition-transform duration-300"
                        style={{
                          color: C.ink,
                          fontFamily: DATA_FONT,
                          transform: isPulsing ? "scale(1.08)" : "scale(1)",
                        }}
                      >
                        {card.value}
                      </p>
                    </div>

                    <div
                      className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: card.accent ? C.rust : C.ink }}
                    >
                      <DashboardIcon type={card.type} />
                    </div>
                  </div>

                  <div
                    className="border-t mt-5 pt-4"
                    style={{ borderColor: C.line }}
                  >
                    <p className="text-xs" style={{ color: C.muted }}>
                      {card.description}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {/* ======================================================
            BIỂU ĐỒ + THEO DÕI TRỰC TIẾP
        ====================================================== */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
          {/* Biểu đồ */}
          <div
            className="xl:col-span-2 rounded-2xl border shadow-sm overflow-hidden"
            style={{ backgroundColor: C.card, borderColor: C.line }}
          >
            <div
              className="px-5 sm:px-7 py-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              style={{ borderColor: C.line }}
            >
              <div>
                <h2
                  className="text-lg font-semibold"
                  style={{ color: C.ink, fontFamily: DISPLAY_FONT }}
                >
                  Biểu đồ doanh thu
                </h2>

                <p className="text-sm mt-1" style={{ color: C.muted }}>
                  Doanh thu từ các giao dịch hoàn thành theo tháng
                </p>
              </div>

              {dashboardAnalysis.latestMonth && (
                <div
                  className="px-4 py-2 rounded-xl border"
                  style={{ backgroundColor: C.paper, borderColor: C.line }}
                >
                  <p className="text-xs" style={{ color: C.muted }}>
                    Tháng gần nhất
                  </p>

                  <p
                    className="text-sm font-bold mt-1"
                    style={{ color: C.rust, fontFamily: DATA_FONT }}
                  >
                    {formatCurrency(dashboardAnalysis.latestMonth.revenue)}
                  </p>
                </div>
              )}
            </div>

            {monthlyRevenue.length === 0 ? (
              <div className="h-[360px] flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl">
                  📊
                </div>

                <h3
                  className="text-lg font-semibold mt-5"
                  style={{ color: C.ink, fontFamily: DISPLAY_FONT }}
                >
                  Chưa có dữ liệu doanh thu
                </h3>

                <p className="mt-2 max-w-md text-sm" style={{ color: C.muted }}>
                  Biểu đồ sẽ tự động hiển thị khi hệ thống có giao dịch hoàn
                  thành.
                </p>
              </div>
            ) : (
              <div className="w-full h-[360px] px-2 sm:px-5 pt-6 pb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyRevenue}
                    margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="revenueColor"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={C.rust}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={C.rust}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke={C.line}
                    />

                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: C.muted, fontSize: 12 }}
                      dy={10}
                    />

                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={75}
                      tick={{ fill: C.muted, fontSize: 12 }}
                      tickFormatter={(value) =>
                        Number(value).toLocaleString("vi-VN")
                      }
                    />

                    <Tooltip
                      content={<RevenueTooltip />}
                      cursor={{ stroke: C.rust, strokeDasharray: "4 4" }}
                    />

                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={C.rust}
                      strokeWidth={3}
                      fill="url(#revenueColor)"
                      activeDot={{
                        r: 6,
                        fill: C.rust,
                        stroke: "#FFFFFF",
                        strokeWidth: 3,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Theo dõi trực tiếp — TÍNH NĂNG CÔNG NGHỆ */}
          <aside
            className="rounded-2xl border shadow-sm overflow-hidden flex flex-col"
            style={{ backgroundColor: C.card, borderColor: C.line }}
          >
            <div
              className="px-6 py-5 border-b flex items-center justify-between"
              style={{ borderColor: C.line }}
            >
              <div>
                <h2
                  className="text-lg font-semibold"
                  style={{ color: C.ink, fontFamily: DISPLAY_FONT }}
                >
                  Hoạt động trực tiếp
                </h2>

                <p className="text-xs mt-1" style={{ color: C.muted }}>
                  Cập nhật ngay khi có sự kiện, không cần tải lại trang
                </p>
              </div>

              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {liveConnected && (
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                    style={{ backgroundColor: C.moss }}
                  />
                )}
                <span
                  className="relative inline-flex rounded-full h-2.5 w-2.5"
                  style={{ backgroundColor: liveConnected ? C.moss : C.muted }}
                />
              </span>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 380 }}>
              {activityFeed.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="text-3xl mb-3">📡</div>

                  <p className="text-sm" style={{ color: C.muted }}>
                    Chưa có hoạt động nào — mọi đơn hàng và tố cáo mới sẽ hiện
                    ngay tại đây.
                  </p>
                </div>
              ) : (
                <ul>
                  {activityFeed.map((event) => {
                    const meta = ACTIVITY_META[event.type] || {
                      label: "Sự kiện",
                      color: C.muted,
                    };

                    return (
                      <li
                        key={event._feedId}
                        className="px-6 py-3.5 border-b last:border-0 flex items-start gap-3"
                        style={{ borderColor: C.line }}
                      >
                        <span
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: meta.color }}
                        />

                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm leading-snug"
                            style={{ color: C.ink }}
                          >
                            {event.message}
                          </p>

                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                              style={{
                                color: meta.color,
                                backgroundColor: `${meta.color}14`,
                                fontFamily: DATA_FONT,
                              }}
                            >
                              {meta.label}
                            </span>

                            <span
                              className="text-xs"
                              style={{ color: C.muted }}
                            >
                              {timeAgo(event.at)}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </section>

        {/* ======================================================
            TỔNG QUAN CHỈ SỐ
        ====================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
          <div
            className="rounded-2xl border p-5"
            style={{ backgroundColor: C.card, borderColor: C.line }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: C.muted }}>
                Sách trung bình / người dùng
              </p>

              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: C.paper, color: C.ink }}
              >
                <DashboardIcon type="books" />
              </div>
            </div>

            <p
              className="text-2xl font-bold mt-3"
              style={{ color: C.ink, fontFamily: DATA_FONT }}
            >
              {formatDecimal(dashboardAnalysis.averageBooksPerUser)}
            </p>
          </div>

          <div
            className="rounded-2xl border p-5"
            style={{ backgroundColor: C.card, borderColor: C.line }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: C.muted }}>
                Đơn trung bình / người dùng
              </p>

              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: C.paper, color: C.ink }}
              >
                <DashboardIcon type="orders" />
              </div>
            </div>

            <p
              className="text-2xl font-bold mt-3"
              style={{ color: C.ink, fontFamily: DATA_FONT }}
            >
              {formatDecimal(dashboardAnalysis.averageOrdersPerUser)}
            </p>
          </div>

          <div
            className="rounded-2xl border p-5"
            style={{ backgroundColor: C.card, borderColor: C.line }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: C.muted }}>
                Doanh thu trung bình / đơn
              </p>

              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: C.rust }}
              >
                <DashboardIcon type="revenue" />
              </div>
            </div>

            <p
              className="text-2xl font-bold mt-3"
              style={{ color: C.rust, fontFamily: DATA_FONT }}
            >
              {formatCurrency(dashboardAnalysis.averageRevenuePerOrder)}
            </p>
          </div>
        </section>

        {/* ======================================================
            THÁNG CAO ĐIỂM
        ====================================================== */}
        <section className="mt-6">
          <div
            className="rounded-2xl border shadow-sm p-6"
            style={{ backgroundColor: C.card, borderColor: C.line }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: C.paper }}
              >
                🏆
              </div>

              <div>
                <p className="text-sm" style={{ color: C.muted }}>
                  Tháng có doanh thu cao nhất
                </p>

                <h3
                  className="text-xl font-bold mt-1"
                  style={{ color: C.ink, fontFamily: DISPLAY_FONT }}
                >
                  {dashboardAnalysis.highestMonth
                    ? dashboardAnalysis.highestMonth.month
                    : "Chưa có dữ liệu"}
                </h3>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t" style={{ borderColor: C.line }}>
              <p
                className="text-3xl font-bold"
                style={{ color: C.rust, fontFamily: DATA_FONT }}
              >
                {dashboardAnalysis.highestMonth
                  ? formatCurrency(dashboardAnalysis.highestMonth.revenue)
                  : "0đ"}
              </p>

              <p className="text-sm mt-2" style={{ color: C.muted }}>
                Tổng doanh thu ghi nhận trong tháng cao nhất
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
