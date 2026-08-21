import React, { useEffect, useMemo, useState } from "react";

import api from "../../services/api";

// ======================================================
// ICON DÙNG CHUNG
// ======================================================
const Icon = ({ type, className = "w-5 h-5" }) => {
  const icons = {
    users: (
      <>
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
      </>
    ),

    search: (
      <>
        <circle cx="11" cy="11" r="8" strokeWidth="1.8" />
        <path strokeLinecap="round" strokeWidth="1.8" d="m21 21-4.35-4.35" />
      </>
    ),

    refresh: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M20 11a8.1 8.1 0 00-15.5-2M4 4v5h5"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M4 13a8.1 8.1 0 0015.5 2M20 20v-5h-5"
        />
      </>
    ),

    download: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M12 3v12"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="m7 10 5 5 5-5"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M5 21h14"
        />
      </>
    ),

    eye: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
        />
        <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
      </>
    ),

    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" strokeWidth="1.8" />
        <path
          strokeLinecap="round"
          strokeWidth="1.8"
          d="M8 10V7a4 4 0 018 0v3"
        />
      </>
    ),

    unlock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" strokeWidth="1.8" />
        <path
          strokeLinecap="round"
          strokeWidth="1.8"
          d="M8 10V7a4 4 0 017.5-2"
        />
      </>
    ),

    copy: (
      <>
        <rect x="9" y="9" width="11" height="11" rx="2" strokeWidth="1.8" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
        />
      </>
    ),

    close: (
      <>
        <path strokeLinecap="round" strokeWidth="2" d="M6 6l12 12M18 6 6 18" />
      </>
    ),
  };

  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {icons[type]}
    </svg>
  );
};

const ManageUsers = () => {
  const [users, setUsers] = useState([]);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  const [selectedUser, setSelectedUser] = useState(null);

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState("");

  // ======================================================
  // KIỂM TRA TÀI KHOẢN BỊ KHÓA
  // ======================================================
  const checkUserLocked = (user) => {
    return (
      user.isLocked === true ||
      user.locked === true ||
      user.status === "locked" ||
      user.status === "blocked"
    );
  };

  // ======================================================
  // LẤY DANH SÁCH NGƯỜI DÙNG
  // ======================================================
  const fetchUsers = async (showMainLoading = false) => {
    try {
      if (showMainLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const response = await api.get("/api/admin/users");

      const userData = Array.isArray(response.data)
        ? response.data
        : response.data.users || [];

      setUsers(userData);
      setLastUpdated(new Date());
    } catch (requestError) {
      console.error("Lỗi lấy danh sách người dùng:", requestError);

      setError(
        requestError.response?.data?.message ||
          "Không thể tải danh sách người dùng.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers(true);
  }, []);

  // ======================================================
  // TỰ ĐỘNG CẬP NHẬT MỖI 30 GIÂY
  // ======================================================
  useEffect(() => {
    if (!autoRefresh) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      fetchUsers(false);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [autoRefresh]);

  // ======================================================
  // KHÓA HOẶC MỞ KHÓA TÀI KHOẢN
  // ======================================================
  const handleToggleLock = async (user) => {
    const userId = user._id;
    const isLocked = checkUserLocked(user);

    const actionLabel = isLocked ? "mở khóa" : "khóa";

    const confirmed = window.confirm(
      `Bạn có chắc muốn ${actionLabel} tài khoản ${
        user.fullName || user.email
      } không?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(userId);

      const endpoint = isLocked
        ? `/api/admin/users/${userId}/unlock`
        : `/api/admin/users/${userId}/lock`;

      const response = await api.patch(endpoint);

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) => {
          if (currentUser._id !== userId) {
            return currentUser;
          }

          return {
            ...currentUser,
            isLocked: !isLocked,
            locked: !isLocked,
            status: !isLocked ? "locked" : "active",
          };
        }),
      );

      if (selectedUser?._id === userId) {
        setSelectedUser((currentUser) => ({
          ...currentUser,
          isLocked: !isLocked,
          locked: !isLocked,
          status: !isLocked ? "locked" : "active",
        }));
      }

      alert(
        response.data?.message || `Đã ${actionLabel} tài khoản thành công.`,
      );
    } catch (requestError) {
      console.error(`Lỗi ${actionLabel} tài khoản:`, requestError);

      alert(
        requestError.response?.data?.message ||
          `Không thể ${actionLabel} tài khoản.`,
      );
    } finally {
      setProcessingId("");
    }
  };

  // ======================================================
  // SAO CHÉP EMAIL
  // ======================================================
  const handleCopyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
      alert("Đã sao chép email.");
    } catch (copyError) {
      console.error("Không thể sao chép email:", copyError);
      alert("Không thể sao chép email.");
    }
  };

  // ======================================================
  // LỌC VÀ SẮP XẾP
  // ======================================================
  const filteredUsers = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    const result = users.filter((user) => {
      const fullName = String(user.fullName || "").toLowerCase();

      const email = String(user.email || "").toLowerCase();

      const university = String(user.university || "").toLowerCase();

      const phone = String(user.phone || user.phoneNumber || "").toLowerCase();

      const matchesKeyword =
        !keyword ||
        fullName.includes(keyword) ||
        email.includes(keyword) ||
        university.includes(keyword) ||
        phone.includes(keyword);
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "admin" && user.role === "admin") ||
        (roleFilter === "user" && user.role !== "admin");

      const isLocked = checkUserLocked(user);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !isLocked) ||
        (statusFilter === "locked" && isLocked);

      return matchesKeyword && matchesRole && matchesStatus;
    });

    return [...result].sort((firstUser, secondUser) => {
      if (sortBy === "name-asc") {
        return String(firstUser.fullName || "").localeCompare(
          String(secondUser.fullName || ""),
          "vi",
        );
      }

      if (sortBy === "name-desc") {
        return String(secondUser.fullName || "").localeCompare(
          String(firstUser.fullName || ""),
          "vi",
        );
      }

      if (sortBy === "oldest") {
        return (
          new Date(firstUser.createdAt || 0) -
          new Date(secondUser.createdAt || 0)
        );
      }

      return (
        new Date(secondUser.createdAt || 0) - new Date(firstUser.createdAt || 0)
      );
    });
  }, [users, searchKeyword, roleFilter, statusFilter, sortBy]);

  // ======================================================
  // PHÂN TRANG
  // ======================================================
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;

    return filteredUsers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredUsers, currentPage, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, roleFilter, statusFilter, sortBy, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // ======================================================
  // THỐNG KÊ
  // ======================================================
  const totalAdmins = users.filter((user) => user.role === "admin").length;

  const totalLocked = users.filter((user) => checkUserLocked(user)).length;

  const totalActive = users.length - totalLocked;

  // ======================================================
  // XUẤT FILE CSV
  // ======================================================
  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      alert("Không có dữ liệu để xuất.");
      return;
    }

    const headers = [
      "Họ tên",
      "Email",
      "Trường",
      "Số điện thoại",
      "Vai trò",
      "Trạng thái",
      "Ngày tham gia",
    ];

    const rows = filteredUsers.map((user) => [
      user.fullName || "",
      user.email || "",
      user.university || "",
      user.phone || user.phoneNumber || "",
      user.role === "admin" ? "Admin" : "Người dùng",
      checkUserLocked(user) ? "Đã khóa" : "Đang hoạt động",
      user.createdAt
        ? new Date(user.createdAt).toLocaleDateString("vi-VN")
        : "",
    ]);

    const escapeCell = (value) => {
      return `"${String(value).replace(/"/g, '""')}"`;
    };

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });

    const fileUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = fileUrl;
    downloadLink.download = `danh-sach-nguoi-dung-${Date.now()}.csv`;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    URL.revokeObjectURL(fileUrl);
  };

  // ======================================================
  // LOADING
  // ======================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14] py-8">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 animate-pulse">
          <div className="h-52 bg-white/10 rounded-3xl" />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-32 bg-white/10 rounded-2xl" />
            ))}
          </div>

          <div className="h-[550px] bg-white/10 rounded-3xl mt-6" />
        </div>
      </div>
    );
  }

  // ======================================================
  // LỖI
  // ======================================================
  if (error && users.length === 0) {
    return (
      <div className="min-h-[75vh] bg-[#070B14] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#111827] border border-red-500/20 rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-red-500/10 text-4xl rounded-full flex items-center justify-center mx-auto">
            ⚠️
          </div>

          <h2 className="text-2xl font-bold text-white mt-5">
            Không thể tải người dùng
          </h2>

          <p className="text-gray-400 mt-2">{error}</p>

          <button
            type="button"
            onClick={() => fetchUsers(true)}
            className="mt-6 w-full py-3 bg-gradient-to-r from-[#C92127] to-[#EF4444] text-white font-semibold rounded-xl"
          >
            Thử tải lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] pt-24 pb-8 text-white">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6">
        {/* ======================================================
            BANNER
        ====================================================== */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#151C2C] via-[#111827] to-[#090D16] shadow-2xl">
          <div className="absolute inset-0">
            <div className="absolute w-96 h-96 bg-red-500/15 rounded-full blur-3xl -top-56 -right-20" />
            <div className="absolute w-72 h-72 bg-blue-500/10 rounded-full blur-3xl -bottom-48 left-1/4" />
          </div>

          <div className="relative px-6 sm:px-10 py-8 sm:py-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-7">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                User Management Center
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold mt-5">
                Quản lý người dùng
              </h1>

              <p className="text-gray-400 mt-3 max-w-2xl leading-relaxed">
                Quản lý tài khoản, kiểm tra trạng thái và giám sát người dùng
                trên toàn hệ thống Sách SV.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fetchUsers(false)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              >
                <Icon
                  type="refresh"
                  className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
                />

                {refreshing ? "Đang cập nhật" : "Làm mới"}
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#C92127] to-[#EF4444] rounded-xl text-sm font-semibold shadow-lg shadow-red-900/30 hover:brightness-110 transition-all"
              >
                <Icon type="download" />
                Xuất CSV
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================
            THẺ THỐNG KÊ
        ====================================================== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">
          <article className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-400/20 rounded-2xl p-5 shadow-xl">
            <p className="text-sm text-blue-200">Tổng tài khoản</p>

            <div className="flex items-end justify-between mt-3">
              <p className="text-3xl font-bold">{users.length}</p>

              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30">
                <Icon type="users" />
              </div>
            </div>
          </article>

          <article className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-400/20 rounded-2xl p-5 shadow-xl">
            <p className="text-sm text-purple-200">Tài khoản Admin</p>

            <div className="flex items-end justify-between mt-3">
              <p className="text-3xl font-bold">{totalAdmins}</p>

              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-2xl">
                👑
              </div>
            </div>
          </article>

          <article className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-400/20 rounded-2xl p-5 shadow-xl">
            <p className="text-sm text-emerald-200">Đang hoạt động</p>

            <div className="flex items-end justify-between mt-3">
              <p className="text-3xl font-bold">{totalActive}</p>

              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-2xl">
                ✓
              </div>
            </div>
          </article>

          <article className="bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-400/20 rounded-2xl p-5 shadow-xl">
            <p className="text-sm text-red-200">Tài khoản bị khóa</p>

            <div className="flex items-end justify-between mt-3">
              <p className="text-3xl font-bold">{totalLocked}</p>

              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                <Icon type="lock" />
              </div>
            </div>
          </article>
        </section>

        {/* ======================================================
            BỘ LỌC
        ====================================================== */}
        <section className="mt-6 bg-[#101725]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-white/10">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
              <div>
                <h2 className="text-xl font-bold">Danh sách người dùng</h2>

                <p className="text-sm text-gray-400 mt-1">
                  Hiển thị {filteredUsers.length} trên {users.length} tài khoản
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
                  <span>Tự động cập nhật</span>

                  <button
                    type="button"
                    onClick={() => setAutoRefresh((current) => !current)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      autoRefresh ? "bg-emerald-500" : "bg-gray-700"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        autoRefresh ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </label>

                {lastUpdated && (
                  <span className="hidden sm:block text-xs text-gray-500">
                    {lastUpdated.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mt-6">
              <div className="relative md:col-span-2">
                <Icon
                  type="search"
                  className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                />

                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="Tìm tên, email, trường hoặc SĐT..."
                  className="w-full pl-12 pr-4 py-3 bg-[#0B111D] border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="px-4 py-3 bg-[#0B111D] border border-white/10 rounded-xl text-gray-300 outline-none focus:border-red-500/60"
              >
                <option value="all">Tất cả vai trò</option>

                <option value="user">Người dùng</option>

                <option value="admin">Admin</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="px-4 py-3 bg-[#0B111D] border border-white/10 rounded-xl text-gray-300 outline-none focus:border-red-500/60"
              >
                <option value="all">Tất cả trạng thái</option>

                <option value="active">Đang hoạt động</option>

                <option value="locked">Đã khóa</option>
              </select>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="px-4 py-3 bg-[#0B111D] border border-white/10 rounded-xl text-gray-300 outline-none focus:border-red-500/60"
              >
                <option value="newest">Mới tham gia</option>

                <option value="oldest">Tham gia lâu nhất</option>

                <option value="name-asc">Tên A → Z</option>

                <option value="name-desc">Tên Z → A</option>
              </select>
            </div>
          </div>

          {/* ======================================================
              BẢNG
          ====================================================== */}
          {paginatedUsers.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-4xl mx-auto">
                🔍
              </div>

              <h3 className="text-xl font-bold mt-5">
                Không tìm thấy tài khoản
              </h3>

              <p className="text-gray-500 mt-2">
                Thử thay đổi từ khóa hoặc bộ lọc.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead className="bg-white/[0.03]">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-4 font-semibold">Người dùng</th>

                    <th className="px-6 py-4 font-semibold">Trường</th>

                    <th className="px-6 py-4 font-semibold">Vai trò</th>

                    <th className="px-6 py-4 font-semibold">Trạng thái</th>

                    <th className="px-6 py-4 font-semibold">Tham gia</th>

                    <th className="px-6 py-4 font-semibold text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {paginatedUsers.map((user) => {
                    const isLocked = checkUserLocked(user);

                    const isProcessing = processingId === user._id;

                    return (
                      <tr
                        key={user._id}
                        className="hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img
                                src={user.avatar || "/default-avatar.png"}
                                alt={user.fullName || "Người dùng"}
                                onError={(event) => {
                                  event.currentTarget.onerror = null;

                                  event.currentTarget.src =
                                    "/default-avatar.png";
                                }}
                                className="w-12 h-12 rounded-xl object-cover border border-white/10 bg-gray-800"
                              />

                              <span
                                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#101725] ${
                                  isLocked ? "bg-red-500" : "bg-emerald-400"
                                }`}
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate">
                                {user.fullName || "Chưa cập nhật tên"}
                              </p>

                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm text-gray-500 truncate max-w-[210px]">
                                  {user.email}
                                </p>

                                <button
                                  type="button"
                                  onClick={() => handleCopyEmail(user.email)}
                                  className="text-gray-600 hover:text-white"
                                  title="Sao chép email"
                                >
                                  <Icon type="copy" className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <p className="text-sm text-gray-300 max-w-[220px] truncate">
                            {user.university || "Chưa cập nhật"}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold border ${
                              user.role === "admin"
                                ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                                : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                            }`}
                          >
                            {user.role === "admin" ? "Admin" : "Người dùng"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                              isLocked
                                ? "bg-red-500/10 text-red-300 border-red-500/20"
                                : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isLocked ? "bg-red-400" : "bg-emerald-400"
                              }`}
                            />

                            {isLocked ? "Đã khóa" : "Hoạt động"}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-sm text-gray-400">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString(
                                "vi-VN",
                              )
                            : "Không rõ"}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedUser(user)}
                              className="w-10 h-10 bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-300 border border-white/10 rounded-xl flex items-center justify-center transition-all"
                              title="Xem chi tiết"
                            >
                              <Icon type="eye" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleLock(user)}
                              disabled={isProcessing}
                              className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-all disabled:opacity-50 ${
                                isLocked
                                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20"
                                  : "bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/20"
                              }`}
                              title={isLocked ? "Mở khóa" : "Khóa tài khoản"}
                            >
                              {isProcessing ? (
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Icon type={isLocked ? "unlock" : "lock"} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ======================================================
              PHÂN TRANG
          ====================================================== */}
          <div className="px-5 sm:px-6 py-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span>Hiển thị</span>

              <select
                value={rowsPerPage}
                onChange={(event) => setRowsPerPage(Number(event.target.value))}
                className="px-3 py-2 bg-[#0B111D] border border-white/10 rounded-lg text-gray-300"
              >
                <option value={5}>5</option>
                <option value={8}>8</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>

              <span>tài khoản mỗi trang</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm disabled:opacity-30"
              >
                Trước
              </button>

              <span className="px-4 py-2 bg-red-500/10 text-red-300 border border-red-500/20 rounded-lg text-sm">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm disabled:opacity-30"
              >
                Sau
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ======================================================
          MODAL CHI TIẾT NGƯỜI DÙNG
      ====================================================== */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 py-6"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="w-full max-w-lg bg-[#111827] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative h-32 bg-gradient-to-r from-[#8F1117] via-[#C92127] to-[#EF4444]">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/20 hover:bg-black/30 rounded-full flex items-center justify-center"
              >
                <Icon type="close" />
              </button>
            </div>

            <div className="px-6 pb-7">
              <img
                src={selectedUser.avatar || "/default-avatar.png"}
                alt={selectedUser.fullName || "Người dùng"}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/default-avatar.png";
                }}
                className="w-28 h-28 rounded-2xl object-cover border-4 border-[#111827] -mt-14 shadow-xl"
              />

              <div className="mt-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedUser.fullName || "Chưa cập nhật tên"}
                    </h2>

                    <p className="text-gray-400 mt-1">{selectedUser.email}</p>
                  </div>

                  <span
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                      checkUserLocked(selectedUser)
                        ? "bg-red-500/10 text-red-300"
                        : "bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    {checkUserLocked(selectedUser) ? "Đã khóa" : "Hoạt động"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-gray-500">Trường đại học</p>

                    <p className="text-sm font-semibold mt-2">
                      {selectedUser.university || "Chưa cập nhật"}
                    </p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-gray-500">Số điện thoại</p>

                    <p className="text-sm font-semibold mt-2">
                      {selectedUser.phone ||
                        selectedUser.phoneNumber ||
                        "Chưa cập nhật"}
                    </p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-gray-500">Vai trò</p>

                    <p className="text-sm font-semibold mt-2">
                      {selectedUser.role === "admin"
                        ? "Quản trị viên"
                        : "Người dùng"}
                    </p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-gray-500">Ngày tham gia</p>

                    <p className="text-sm font-semibold mt-2">
                      {selectedUser.createdAt
                        ? new Date(selectedUser.createdAt).toLocaleDateString(
                            "vi-VN",
                          )
                        : "Không xác định"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => handleCopyEmail(selectedUser.email)}
                    className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold flex items-center justify-center gap-2"
                  >
                    <Icon type="copy" />
                    Sao chép email
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleLock(selectedUser)}
                    disabled={processingId === selectedUser._id}
                    className={`py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 ${
                      checkUserLocked(selectedUser)
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "bg-red-500 text-white hover:bg-red-600"
                    }`}
                  >
                    <Icon
                      type={checkUserLocked(selectedUser) ? "unlock" : "lock"}
                    />

                    {checkUserLocked(selectedUser)
                      ? "Mở khóa tài khoản"
                      : "Khóa tài khoản"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
