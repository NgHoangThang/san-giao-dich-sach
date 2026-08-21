import React, { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const statusOptions = {
  pending: {
    label: "Chờ xử lý",
    className: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    dotClass: "bg-amber-400",
  },
  resolved: {
    label: "Đã xử lý",
    className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    dotClass: "bg-emerald-400",
  },
  dismissed: {
    label: "Đã bỏ qua",
    className: "bg-gray-500/10 text-gray-300 border-gray-500/20",
    dotClass: "bg-gray-400",
  },
};

const ManageReports = () => {
  const [reports, setReports] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");

  // ======================================================
  // LẤY DANH SÁCH TỐ CÁO
  // ======================================================
  const fetchReports = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError("");

      const response = await api.get("/api/admin/reports");
      const reportData = Array.isArray(response.data)
        ? response.data
        : response.data.reports || [];

      setReports(reportData);
    } catch (requestError) {
      console.error("Lỗi lấy danh sách tố cáo:", requestError);
      setError(
        requestError.response?.data?.message ||
          "Không thể tải danh sách tố cáo.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports(true);
  }, []);

  // ======================================================
  // HÀM LẤY THÔNG TIN LINH HOẠT
  // ======================================================
  const getReporter = (report) => {
    return report.reporterId || report.reporter || report.createdBy || null;
  };

  const getReporterEmail = (report) => {
    const reporter = getReporter(report);
    if (typeof reporter === "object" && reporter !== null) {
      return reporter.email || "";
    }
    return report.reporterEmail || "";
  };

  const getReporterName = (report) => {
    const reporter = getReporter(report);
    if (typeof reporter === "object" && reporter !== null) {
      return (
        reporter.fullName ||
        reporter.name ||
        reporter.username ||
        "Người dùng ẩn danh"
      );
    }
    return report.reporterName || "Người dùng ẩn danh";
  };

  const getTargetUser = (report) => {
    if (report.targetType !== "user") return null;
    return (
      report.target ||
      report.reportedUserId ||
      report.targetUserId ||
      report.userId ||
      report.reportedUser ||
      null
    );
  };

  const getTargetBook = (report) => {
    if (report.targetType !== "book") return null;
    return (
      report.target ||
      report.bookId ||
      report.reportedBookId ||
      report.targetBook ||
      null
    );
  };

  const getTargetName = (report) => {
    if (report.targetType === "user") {
      const targetUser = getTargetUser(report);
      if (typeof targetUser === "object" && targetUser !== null) {
        return (
          targetUser.fullName ||
          targetUser.name ||
          targetUser.email ||
          "Tài khoản bị tố cáo"
        );
      }
      return "Tài khoản đã bị xóa hoặc không tồn tại";
    }

    if (report.targetType === "book") {
      const targetBook = getTargetBook(report);
      if (typeof targetBook === "object" && targetBook !== null) {
        return targetBook.title || targetBook.name || "Sách bị tố cáo";
      }
      return "Sách đã bị xóa hoặc không tồn tại";
    }

    return "Không xác định loại đối tượng";
  };

  const getReportReason = (report) => {
    return (
      report.reason || report.category || report.type || "Không ghi rõ lý do"
    );
  };

  const getReportDescription = (report) => {
    return (
      report.description ||
      report.content ||
      report.details ||
      "Không có mô tả chi tiết"
    );
  };

  // ======================================================
  // CẬP NHẬT TRẠNG THÁI
  // ======================================================
  const handleUpdateStatus = async (report, newStatus) => {
    const statusLabel = statusOptions[newStatus]?.label || newStatus;
    const confirmed = window.confirm(
      `Bạn có chắc muốn chuyển tố cáo này sang trạng thái "${statusLabel}" không?`,
    );

    if (!confirmed) return;

    try {
      setProcessingId(report._id);
      const response = await api.patch(
        `/api/admin/reports/${report._id}/status`,
        {
          status: newStatus,
        },
      );

      setReports((currentReports) =>
        currentReports.map((currentReport) =>
          currentReport._id === report._id
            ? { ...currentReport, status: newStatus }
            : currentReport,
        ),
      );

      if (selectedReport?._id === report._id) {
        setSelectedReport((currentReport) => ({
          ...currentReport,
          status: newStatus,
        }));
      }

      alert(response.data?.message || "Cập nhật trạng thái tố cáo thành công.");
    } catch (requestError) {
      console.error("Lỗi cập nhật tố cáo:", requestError);
      alert(
        requestError.response?.data?.message ||
          "Không thể cập nhật trạng thái tố cáo.",
      );
    } finally {
      setProcessingId("");
    }
  };
  // ======================================================
  // XÓA TỐ CÁO
  // ======================================================
  const handleDeleteReport = async (report) => {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa vĩnh viễn tố cáo này không?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(report._id);

      const response = await api.delete(`/api/admin/reports/${report._id}`);

      setReports((currentReports) =>
        currentReports.filter(
          (currentReport) => currentReport._id !== report._id,
        ),
      );

      if (selectedReport?._id === report._id) {
        setSelectedReport(null);
      }

      alert(response.data?.message || "Đã xóa tố cáo thành công.");
    } catch (requestError) {
      console.error("Lỗi xóa tố cáo:", requestError);

      alert(requestError.response?.data?.message || "Không thể xóa tố cáo.");
    } finally {
      setProcessingId("");
    }
  };
  // ======================================================
  // LỌC VÀ SẮP XẾP
  // ======================================================
  const filteredReports = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    const result = reports.filter((report) => {
      const reporterName = getReporterName(report).toLowerCase();
      const reporterEmail = getReporterEmail(report).toLowerCase();
      const targetName = getTargetName(report).toLowerCase();
      const reason = getReportReason(report).toLowerCase();
      const description = getReportDescription(report).toLowerCase();

      const matchesKeyword =
        !keyword ||
        reporterName.includes(keyword) ||
        reporterEmail.includes(keyword) ||
        targetName.includes(keyword) ||
        reason.includes(keyword) ||
        description.includes(keyword);

      const currentStatus = report.status || "pending";
      const matchesStatus =
        statusFilter === "all" || currentStatus === statusFilter;

      return matchesKeyword && matchesStatus;
    });

    return [...result].sort((firstReport, secondReport) => {
      const firstDate = new Date(firstReport.createdAt || 0);
      const secondDate = new Date(secondReport.createdAt || 0);

      if (sortBy === "oldest") {
        return firstDate - secondDate;
      }
      return secondDate - firstDate;
    });
  }, [reports, searchKeyword, statusFilter, sortBy]);

  // ======================================================
  // THỐNG KÊ
  // ======================================================
  const totalPending = reports.filter(
    (report) => (report.status || "pending") === "pending",
  ).length;

  const totalResolved = reports.filter(
    (report) => report.status === "resolved",
  ).length;
  const totalDismissed = reports.filter(
    (report) => report.status === "dismissed",
  ).length;

  // ======================================================
  // COMPONENT TRẠNG THÁI
  // ======================================================
  const StatusBadge = ({ status }) => {
    const currentStatus = statusOptions[status] || statusOptions.pending;
    return (
      <span
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${currentStatus.className}`}
      >
        <span className={`w-2 h-2 rounded-full ${currentStatus.dotClass}`} />
        {currentStatus.label}
      </span>
    );
  };

  // ======================================================
  // LOADING
  // ======================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14] pt-24 pb-10">
        <div className="max-w-[1450px] mx-auto px-4 sm:px-6 animate-pulse">
          <div className="h-48 bg-white/10 rounded-3xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-28 bg-white/10 rounded-2xl" />
            ))}
          </div>
          <div className="h-[500px] bg-white/10 rounded-3xl mt-6" />
        </div>
      </div>
    );
  }

  // ======================================================
  // LỖI
  // ======================================================
  if (error && reports.length === 0) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#111827] border border-red-500/20 rounded-3xl p-8 text-center text-white">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-2xl font-bold mt-5">Không thể tải tố cáo</h2>
          <p className="text-gray-400 mt-2">{error}</p>
          <button
            type="button"
            onClick={() => fetchReports(true)}
            className="w-full mt-6 py-3 bg-gradient-to-r from-[#C92127] to-red-500 rounded-xl font-semibold"
          >
            Thử tải lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] pt-24 pb-10 text-white">
      <div className="max-w-[1450px] mx-auto px-4 sm:px-6">
        {/* ======================================================
            BANNER
        ====================================================== */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1A1025] via-[#151322] to-[#090D16] shadow-2xl">
          <div className="absolute inset-0">
            <div className="absolute w-96 h-96 bg-red-500/15 rounded-full blur-3xl -top-56 -right-20" />
            <div className="absolute w-72 h-72 bg-purple-500/10 rounded-full blur-3xl -bottom-48 left-1/4" />
          </div>
          <div className="relative px-6 sm:px-10 py-8 sm:py-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">
                <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                Report Moderation Center
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mt-5">
                Quản lý tố cáo
              </h1>
              <p className="text-gray-400 mt-3 max-w-2xl leading-relaxed">
                Theo dõi, kiểm tra và xử lý các tố cáo được gửi từ người dùng
                trên hệ thống Sách SV.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchReports(false)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold disabled:opacity-50"
            >
              <span className={refreshing ? "animate-spin" : ""}>↻</span>
              {refreshing ? "Đang cập nhật" : "Làm mới dữ liệu"}
            </button>
          </div>
        </section>

        {/* ======================================================
            THỐNG KÊ
        ====================================================== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">
          <article className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-400/20 rounded-2xl p-5">
            <p className="text-sm text-blue-200">Tổng tố cáo</p>
            <div className="flex items-end justify-between mt-3">
              <p className="text-3xl font-bold">{reports.length}</p>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-2xl">
                📋
              </div>
            </div>
          </article>
          <article className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-400/20 rounded-2xl p-5">
            <p className="text-sm text-amber-200">Chờ xử lý</p>
            <div className="flex items-end justify-between mt-3">
              <p className="text-3xl font-bold">{totalPending}</p>
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-2xl">
                ⏳
              </div>
            </div>
          </article>
          <article className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-400/20 rounded-2xl p-5">
            <p className="text-sm text-emerald-200">Đã xử lý</p>
            <div className="flex items-end justify-between mt-3">
              <p className="text-3xl font-bold">{totalResolved}</p>
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-2xl">
                ✓
              </div>
            </div>
          </article>
          <article className="bg-gradient-to-br from-gray-500/20 to-gray-500/5 border border-gray-400/20 rounded-2xl p-5">
            <p className="text-sm text-gray-300">Đã bỏ qua</p>
            <div className="flex items-end justify-between mt-3">
              <p className="text-3xl font-bold">{totalDismissed}</p>
              <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center text-2xl">
                ✕
              </div>
            </div>
          </article>
        </section>

        {/* ======================================================
            DANH SÁCH TỐ CÁO
        ====================================================== */}
        <section className="mt-6 bg-[#101725]/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-white/10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Danh sách tố cáo</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Hiển thị {filteredReports.length} trên {reports.length} tố cáo
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="Tìm người gửi, lý do..."
                  className="sm:min-w-[300px] px-4 py-3 bg-[#0B111D] border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-red-500/60"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="px-4 py-3 bg-[#0B111D] border border-white/10 rounded-xl text-gray-300 outline-none"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ xử lý</option>
                  <option value="resolved">Đã xử lý</option>
                  <option value="dismissed">Đã bỏ qua</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="px-4 py-3 bg-[#0B111D] border border-white/10 rounded-xl text-gray-300 outline-none"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="oldest">Cũ nhất</option>
                </select>
              </div>
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-6xl">🔍</div>
              <h3 className="text-xl font-bold mt-5">Không tìm thấy tố cáo</h3>
              <p className="text-gray-500 mt-2">
                Thử thay đổi từ khóa hoặc bộ lọc.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-white/[0.03]">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-4">Người tố cáo</th>
                    <th className="px-6 py-4">Đối tượng</th>
                    <th className="px-6 py-4">Lý do</th>
                    <th className="px-6 py-4">Trạng thái</th>
                    <th className="px-6 py-4">Ngày gửi</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredReports.map((report) => {
                    const currentStatus = report.status || "pending";
                    const isProcessing = processingId === report._id;

                    return (
                      <tr
                        key={report._id}
                        className="hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-6 py-5">
                          <p className="font-semibold text-white">
                            {getReporterName(report)}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {getReporterEmail(report) || "Không có email"}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-gray-300 font-medium max-w-[220px] truncate">
                            {getTargetName(report)}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-gray-300 font-medium max-w-[230px] truncate">
                            {getReportReason(report)}
                          </p>
                          <p className="text-sm text-gray-500 mt-1 max-w-[250px] truncate">
                            {getReportDescription(report)}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <StatusBadge status={currentStatus} />
                        </td>
                        <td className="px-6 py-5 text-sm text-gray-400">
                          {report.createdAt
                            ? new Date(report.createdAt).toLocaleDateString(
                                "vi-VN",
                              )
                            : "Không rõ"}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteReport(report)}
                              disabled={isProcessing}
                              className="px-3 py-2 bg-red-500/10 text-red-300 border border-red-500/20 rounded-lg text-sm font-semibold hover:bg-red-500/20 disabled:opacity-50"
                            >
                              Xóa
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedReport(report)}
                              className="px-3 py-2 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-lg text-sm font-semibold hover:bg-blue-500/20"
                            >
                              Xem
                            </button>
                            {currentStatus !== "resolved" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateStatus(report, "resolved")
                                }
                                disabled={isProcessing}
                                className="px-3 py-2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-lg text-sm font-semibold hover:bg-emerald-500/20 disabled:opacity-50"
                              >
                                Xử lý
                              </button>
                            )}
                            {currentStatus !== "dismissed" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateStatus(report, "dismissed")
                                }
                                disabled={isProcessing}
                                className="px-3 py-2 bg-gray-500/10 text-gray-300 border border-gray-500/20 rounded-lg text-sm font-semibold hover:bg-gray-500/20 disabled:opacity-50"
                              >
                                Bỏ qua
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ======================================================
          MODAL CHI TIẾT
      ====================================================== */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center px-4 py-6"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#111827] border border-white/10 rounded-3xl shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-red-300 font-semibold">
                    CHI TIẾT TỐ CÁO
                  </p>
                  <h2 className="text-2xl font-bold mt-2">
                    {getReportReason(selectedReport)}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5">
                <StatusBadge status={selectedReport.status || "pending"} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 uppercase">
                    Người tố cáo
                  </p>
                  <p className="font-semibold mt-2">
                    {getReporterName(selectedReport)}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {getReporterEmail(selectedReport) || "Không có email"}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 uppercase">
                    Đối tượng bị tố cáo
                  </p>
                  <p className="font-semibold mt-2">
                    {getTargetName(selectedReport)}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 uppercase">Ngày gửi</p>
                  <p className="font-semibold mt-2">
                    {selectedReport.createdAt
                      ? new Date(selectedReport.createdAt).toLocaleString(
                          "vi-VN",
                        )
                      : "Không xác định"}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 uppercase">Mã tố cáo</p>
                  <p className="font-mono text-sm mt-2 break-all">
                    {selectedReport._id}
                  </p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mt-4">
                <p className="text-xs text-gray-500 uppercase">
                  Nội dung mô tả
                </p>
                <p className="text-gray-300 leading-relaxed whitespace-pre-line mt-3">
                  {getReportDescription(selectedReport)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedReport, "resolved")}
                  disabled={processingId === selectedReport._id}
                  className="py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-semibold disabled:opacity-50"
                >
                  ✓ Đánh dấu đã xử lý
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateStatus(selectedReport, "dismissed")
                  }
                  disabled={processingId === selectedReport._id}
                  className="py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold disabled:opacity-50"
                >
                  ✕ Bỏ qua tố cáo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageReports;
