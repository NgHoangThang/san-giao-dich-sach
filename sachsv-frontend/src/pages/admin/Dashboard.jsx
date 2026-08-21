import React, { useEffect, useMemo, useState } from "react";
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

// ======================================================
// ICON
// ======================================================
const DashboardIcon = ({ type }) => {
  const commonClass = "w-7 h-7";

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
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3">
      <p className="text-sm font-semibold text-gray-900">{label}</p>

      <p className="text-sm text-gray-500 mt-1">Doanh thu</p>

      <p className="text-base font-bold text-[#C92127] mt-1">
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

  // ======================================================
  // LẤY DỮ LIỆU DASHBOARD
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

  // ======================================================
  // THẺ THỐNG KÊ
  // ======================================================
  const statisticCards = [
    {
      title: "Tổng người dùng",
      value: statistics.totalUsers.toLocaleString("vi-VN"),
      description: "Tài khoản trong hệ thống",
      type: "users",
      cardClass: "from-blue-500/10 via-blue-50 to-white border-blue-100",
      iconClass: "bg-blue-500 text-white shadow-blue-200",
      topLine: "bg-blue-500",
    },
    {
      title: "Tổng số sách",
      value: statistics.totalBooks.toLocaleString("vi-VN"),
      description: "Sách đã được đăng tải",
      type: "books",
      cardClass:
        "from-emerald-500/10 via-emerald-50 to-white border-emerald-100",
      iconClass: "bg-emerald-500 text-white shadow-emerald-200",
      topLine: "bg-emerald-500",
    },
    {
      title: "Tổng đơn hàng",
      value: statistics.totalOrders.toLocaleString("vi-VN"),
      description: "Giao dịch được tạo",
      type: "orders",
      cardClass: "from-amber-500/10 via-amber-50 to-white border-amber-100",
      iconClass: "bg-amber-500 text-white shadow-amber-200",
      topLine: "bg-amber-500",
    },
    {
      title: "Tổng doanh thu",
      value: formatCurrency(statistics.totalRevenue),
      description: "Từ giao dịch hoàn thành",
      type: "revenue",
      cardClass: "from-red-500/10 via-red-50 to-white border-red-100",
      iconClass: "bg-[#C92127] text-white shadow-red-200",
      topLine: "bg-[#C92127]",
    },
  ];

  // ======================================================
  // LOADING
  // ======================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] py-8">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 animate-pulse">
          <div className="h-52 bg-gray-200 rounded-3xl" />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-40 bg-white rounded-2xl border border-gray-100"
              />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
            <div className="xl:col-span-2 h-[440px] bg-white rounded-2xl" />
            <div className="h-[440px] bg-white rounded-2xl" />
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
      <div className="min-h-[75vh] bg-[#F3F4F6] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-red-100 shadow-xl shadow-gray-200/70 p-8 text-center">
          <div className="w-20 h-20 bg-red-50 text-4xl rounded-full flex items-center justify-center mx-auto">
            ⚠️
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-5">
            Không thể tải Dashboard
          </h2>

          <p className="text-gray-500 mt-2 leading-relaxed">{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 w-full px-5 py-3 bg-[#C92127] text-white font-semibold rounded-xl hover:bg-[#A8171C] transition-colors"
          >
            Tải lại dữ liệu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] py-6 sm:py-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        {/* ======================================================
            BANNER
        ====================================================== */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#8F1117] via-[#C92127] to-[#EF4444] rounded-3xl shadow-xl shadow-red-200/60">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-80 h-80 bg-white/10 rounded-full -top-40 -right-20" />
            <div className="absolute w-52 h-52 bg-white/10 rounded-full -bottom-28 right-1/3" />
            <div className="absolute w-32 h-32 bg-white/10 rounded-full top-12 left-1/2" />
          </div>

          <div className="relative px-6 sm:px-10 py-8 sm:py-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-7">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                Trung tâm quản trị hệ thống
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-white mt-5">
                Chào mừng trở lại, Admin!
              </h1>

              <p className="text-red-50 mt-3 max-w-2xl leading-relaxed">
                Theo dõi người dùng, sách, đơn hàng và doanh thu của hệ thống
                Sách SV tại một nơi.
              </p>
            </div>

            <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-5 min-w-[230px]">
              <p className="text-sm text-red-100">Dữ liệu cập nhật lúc</p>

              <p className="text-lg font-bold text-white mt-2">
                {lastUpdated
                  ? lastUpdated.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--:--"}
              </p>

              <p className="text-sm text-red-100 mt-1">
                {lastUpdated ? lastUpdated.toLocaleDateString("vi-VN") : ""}
              </p>
            </div>
          </div>
        </section>

        {/* ======================================================
            THẺ THỐNG KÊ
        ====================================================== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">
          {statisticCards.map((card) => (
            <article
              key={card.title}
              className={`relative overflow-hidden bg-gradient-to-br ${card.cardClass} border rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${card.topLine}`}
              />

              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500">
                      {card.title}
                    </p>

                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-3 break-words">
                      {card.value}
                    </p>
                  </div>

                  <div
                    className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-lg ${card.iconClass}`}
                  >
                    <DashboardIcon type={card.type} />
                  </div>
                </div>

                <div className="border-t border-black/5 mt-5 pt-4">
                  <p className="text-sm text-gray-500">{card.description}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* ======================================================
            BIỂU ĐỒ VÀ TỔNG QUAN
        ====================================================== */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
          {/* Biểu đồ */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 sm:px-7 py-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Biểu đồ doanh thu
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Doanh thu từ các giao dịch hoàn thành theo tháng
                </p>
              </div>

              {dashboardAnalysis.latestMonth && (
                <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-xl">
                  <p className="text-xs text-gray-500">Tháng gần nhất</p>

                  <p className="text-sm font-bold text-[#C92127] mt-1">
                    {formatCurrency(dashboardAnalysis.latestMonth.revenue)}
                  </p>
                </div>
              )}
            </div>

            {monthlyRevenue.length === 0 ? (
              <div className="h-[390px] flex flex-col items-center justify-center text-center px-4">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-4xl">
                  📊
                </div>

                <h3 className="text-xl font-bold text-gray-900 mt-5">
                  Chưa có dữ liệu doanh thu
                </h3>

                <p className="text-gray-500 mt-2 max-w-md">
                  Biểu đồ sẽ tự động hiển thị khi hệ thống có giao dịch hoàn
                  thành.
                </p>
              </div>
            ) : (
              <div className="w-full h-[390px] px-2 sm:px-5 pt-6 pb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyRevenue}
                    margin={{
                      top: 15,
                      right: 20,
                      left: 0,
                      bottom: 5,
                    }}
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
                          stopColor="#C92127"
                          stopOpacity={0.35}
                        />

                        <stop
                          offset="95%"
                          stopColor="#C92127"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="#E5E7EB"
                    />

                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: "#6B7280",
                        fontSize: 12,
                      }}
                      dy={10}
                    />

                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={75}
                      tick={{
                        fill: "#6B7280",
                        fontSize: 12,
                      }}
                      tickFormatter={(value) =>
                        Number(value).toLocaleString("vi-VN")
                      }
                    />

                    <Tooltip
                      content={<RevenueTooltip />}
                      cursor={{
                        stroke: "#C92127",
                        strokeDasharray: "4 4",
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#C92127"
                      strokeWidth={3}
                      fill="url(#revenueColor)"
                      activeDot={{
                        r: 6,
                        fill: "#C92127",
                        stroke: "#FFFFFF",
                        strokeWidth: 3,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Tổng quan */}
          <aside className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                Tổng quan hệ thống
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Chỉ số được tính từ dữ liệu hiện tại
              </p>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      Sách trung bình/người dùng
                    </p>

                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {formatDecimal(dashboardAnalysis.averageBooksPerUser)}
                    </p>
                  </div>

                  <div className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center">
                    <DashboardIcon type="books" />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      Đơn trung bình/người dùng
                    </p>

                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {formatDecimal(dashboardAnalysis.averageOrdersPerUser)}
                    </p>
                  </div>

                  <div className="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center">
                    <DashboardIcon type="orders" />
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      Doanh thu trung bình/đơn
                    </p>

                    <p className="text-xl font-bold text-gray-900 mt-2">
                      {formatCurrency(dashboardAnalysis.averageRevenuePerOrder)}
                    </p>
                  </div>

                  <div className="w-12 h-12 bg-[#C92127] text-white rounded-xl flex items-center justify-center">
                    <DashboardIcon type="revenue" />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* ======================================================
            THÔNG TIN BỔ SUNG
        ====================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center text-2xl">
                🏆
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Tháng có doanh thu cao nhất
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-1">
                  {dashboardAnalysis.highestMonth
                    ? dashboardAnalysis.highestMonth.month
                    : "Chưa có dữ liệu"}
                </h3>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-3xl font-bold text-[#C92127]">
                {dashboardAnalysis.highestMonth
                  ? formatCurrency(dashboardAnalysis.highestMonth.revenue)
                  : "0đ"}
              </p>

              <p className="text-sm text-gray-500 mt-2">
                Tổng doanh thu ghi nhận trong tháng cao nhất
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl shadow-sm p-6 overflow-hidden relative">
            <div className="absolute w-40 h-40 bg-white/5 rounded-full -right-16 -top-16" />

            <div className="relative">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">
                  ⚙️
                </div>

                <div>
                  <p className="text-sm text-gray-300">Trạng thái Dashboard</p>

                  <h3 className="text-xl font-bold mt-1">Đã đồng bộ dữ liệu</h3>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-400">Nguồn dữ liệu</p>

                  <p className="font-semibold mt-1">Admin API</p>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/15 text-green-300 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  Đã tải thành công
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
