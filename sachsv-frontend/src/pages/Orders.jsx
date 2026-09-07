import React, { useCallback, useEffect, useState } from "react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import ReviewModal from "../components/ReviewModal";
import { getPlaceholderImage } from "../utils/placeholderImage";

const statusMap = {
  pending: {
    label: "Chờ xác nhận",
    className: "bg-yellow-100 text-yellow-700",
  },

  confirmed: {
    label: "Đã xác nhận",
    className: "bg-blue-100 text-blue-700",
  },

  preparing: {
    label: "Đang chuẩn bị",
    className: "bg-purple-100 text-purple-700",
  },

  shipping: {
    label: "Đang giao",
    className: "bg-orange-100 text-orange-700",
  },

  delivered: {
    label: "Đã giao",
    className: "bg-cyan-100 text-cyan-700",
  },

  completed: {
    label: "Hoàn thành",
    className: "bg-green-100 text-green-700",
  },

  cancelled: {
    label: "Đã hủy",
    className: "bg-red-100 text-red-700",
  },
};

const Orders = () => {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState("buy");

  const [buyOrders, setBuyOrders] = useState([]);

  const [sellOrders, setSellOrders] = useState([]);

  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");

  const [selectedReviewOrder, setSelectedReviewOrder] = useState(null);

  // ======================================================
  // POPUP THEO DÕI ĐƠN HÀNG
  // ======================================================
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");

  // ======================================================
  // POPUP VẬN CHUYỂN
  // ======================================================
  const [showShippingModal, setShowShippingModal] = useState(false);

  const [selectedShippingOrder, setSelectedShippingOrder] = useState(null);

  const [shippingMode, setShippingMode] = useState("start");

  const [shippingForm, setShippingForm] = useState({
    shippingProvider: "",
    trackingCode: "",
    estimatedDeliveryDate: "",
    location: "",
    shippingNote: "",
  });

  // ======================================================
  // LẤY DANH SÁCH ĐƠN HÀNG
  // ======================================================
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const buyResponse = await api.get("/api/orders/history/buy");

      const buyData = Array.isArray(buyResponse.data)
        ? buyResponse.data
        : buyResponse.data.orders || [];

      setBuyOrders(buyData);

      // Chỉ Admin mới tải đơn bán
      if (isAdmin) {
        const sellResponse = await api.get("/api/orders/history/sell");

        const sellData = Array.isArray(sellResponse.data)
          ? sellResponse.data
          : sellResponse.data.orders || [];

        setSellOrders(sellData);
      } else {
        setSellOrders([]);
      }
    } catch (requestError) {
      console.error("Lỗi tải đơn hàng:", requestError);

      setError(
        requestError.response?.data?.message ||
          "Không thể tải danh sách đơn hàng.",
      );
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Sinh viên không được ở tab bán
  useEffect(() => {
    if (!isAdmin && activeTab === "sell") {
      setActiveTab("buy");
    }
  }, [isAdmin, activeTab]);

  // ======================================================
  // ADMIN DUYỆT ĐƠN
  // ======================================================
  const handleAccept = async (orderId) => {
    const confirmed = window.confirm(
      "Bạn có chắc muốn duyệt đơn hàng này không?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(`accept-${orderId}`);

      const response = await api.patch(`/api/orders/${orderId}/accept`);

      alert(response.data.message || "Duyệt đơn hàng thành công.");

      await loadOrders();
    } catch (requestError) {
      console.error("Lỗi duyệt đơn:", requestError);

      alert(
        requestError.response?.data?.message || "Không thể duyệt đơn hàng.",
      );
    } finally {
      setActionLoading("");
    }
  };

  // ======================================================
  // ADMIN XÁC NHẬN ĐÃ NHẬN THANH TOÁN QR
  // ======================================================
  const handleConfirmPayment = async (orderId) => {
    const confirmed = window.confirm(
      "Xác nhận bạn đã kiểm tra tài khoản ngân hàng và nhận được tiền cho đơn này?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(`confirm-payment-${orderId}`);

      const response = await api.patch(
        `/api/orders/${orderId}/confirm-payment`,
      );

      alert(response.data.message || "Đã xác nhận thanh toán.");

      await loadOrders();
    } catch (requestError) {
      console.error("Lỗi xác nhận thanh toán:", requestError);

      alert(
        requestError.response?.data?.message ||
          "Không thể xác nhận thanh toán.",
      );
    } finally {
      setActionLoading("");
    }
  };

  // ======================================================
  // ADMIN CHUYỂN SANG ĐANG CHUẨN BỊ
  // confirmed -> preparing
  // ======================================================
  const handlePrepare = async (orderId) => {
    const confirmed = window.confirm("Bắt đầu chuẩn bị sách cho đơn hàng này?");

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(`prepare-${orderId}`);

      const response = await api.patch(`/api/orders/${orderId}/prepare`);

      alert(response.data.message || "Đơn hàng đang được chuẩn bị.");

      await loadOrders();
    } catch (requestError) {
      console.error("Lỗi chuẩn bị đơn:", requestError);

      alert(
        requestError.response?.data?.message ||
          "Không thể chuyển sang trạng thái chuẩn bị.",
      );
    } finally {
      setActionLoading("");
    }
  };

  // ======================================================
  // MỞ POPUP BẮT ĐẦU GIAO / CẬP NHẬT VẬN CHUYỂN
  // ======================================================
  const openShippingModal = (order, mode = "start") => {
    setSelectedShippingOrder(order);
    setShippingMode(mode);

    setShippingForm({
      shippingProvider: order.shippingProvider || "",

      trackingCode: order.trackingCode || "",

      estimatedDeliveryDate: order.estimatedDeliveryDate
        ? new Date(order.estimatedDeliveryDate).toISOString().split("T")[0]
        : "",

      location: "",

      shippingNote: mode === "update" ? order.shippingNote || "" : "",
    });

    setShowShippingModal(true);
  };

  // ======================================================
  // ĐÓNG POPUP VẬN CHUYỂN
  // ======================================================
  const closeShippingModal = () => {
    if (actionLoading) {
      return;
    }

    setShowShippingModal(false);
    setSelectedShippingOrder(null);
    setShippingMode("start");

    setShippingForm({
      shippingProvider: "",
      trackingCode: "",
      estimatedDeliveryDate: "",
      location: "",
      shippingNote: "",
    });
  };

  // ======================================================
  // NHẬP THÔNG TIN VẬN CHUYỂN
  // ======================================================
  const handleShippingFormChange = (event) => {
    const { name, value } = event.target;

    setShippingForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ======================================================
  // ADMIN BẮT ĐẦU GIAO HOẶC CẬP NHẬT VẬN CHUYỂN
  // ======================================================
  const handleSubmitShipping = async (event) => {
    event.preventDefault();

    if (!selectedShippingOrder) {
      return;
    }

    const {
      shippingProvider,
      trackingCode,
      estimatedDeliveryDate,
      location,
      shippingNote,
    } = shippingForm;

    // Khi bắt đầu giao thì bắt buộc đủ thông tin
    if (shippingMode === "start") {
      if (!shippingProvider.trim()) {
        alert("Vui lòng nhập đơn vị vận chuyển.");
        return;
      }

      if (!trackingCode.trim()) {
        alert("Vui lòng nhập mã vận đơn.");
        return;
      }

      if (!estimatedDeliveryDate) {
        alert("Vui lòng chọn ngày dự kiến giao.");
        return;
      }
    }

    // Khi cập nhật thì phải có ít nhất vị trí hoặc ghi chú
    if (shippingMode === "update" && !location.trim() && !shippingNote.trim()) {
      alert("Vui lòng nhập vị trí hoặc ghi chú vận chuyển.");
      return;
    }

    const orderId = selectedShippingOrder._id;

    try {
      setActionLoading(
        `${shippingMode === "start" ? "ship" : "shipping-update"}-${orderId}`,
      );

      let response;

      if (shippingMode === "start") {
        response = await api.patch(`/api/orders/${orderId}/ship`, {
          shippingProvider: shippingProvider.trim(),
          trackingCode: trackingCode.trim(),
          estimatedDeliveryDate,
          shippingNote: shippingNote.trim(),
        });
      } else {
        response = await api.patch(`/api/orders/${orderId}/shipping-update`, {
          shippingProvider: shippingProvider.trim(),
          trackingCode: trackingCode.trim(),
          estimatedDeliveryDate,
          location: location.trim(),
          shippingNote: shippingNote.trim(),
        });
      }

      alert(response.data.message || "Cập nhật vận chuyển thành công.");

      setShowShippingModal(false);
      setSelectedShippingOrder(null);

      await loadOrders();
    } catch (requestError) {
      console.error("Lỗi cập nhật vận chuyển:", requestError);

      alert(
        requestError.response?.data?.message ||
          "Không thể cập nhật vận chuyển.",
      );
    } finally {
      setActionLoading("");
    }
  };

  // ======================================================
  // ADMIN XÁC NHẬN ĐÃ GIAO
  // shipping -> delivered
  // ======================================================
  const handleDeliver = async (orderId) => {
    const confirmed = window.confirm(
      "Xác nhận đơn hàng này đã được giao đến người mua?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(`deliver-${orderId}`);

      const response = await api.patch(`/api/orders/${orderId}/deliver`);

      alert(response.data.message || "Đã xác nhận giao hàng.");

      await loadOrders();
    } catch (requestError) {
      console.error("Lỗi xác nhận giao hàng:", requestError);

      alert(
        requestError.response?.data?.message || "Không thể xác nhận đã giao.",
      );
    } finally {
      setActionLoading("");
    }
  };

  // ======================================================
  // NGƯỜI MUA XÁC NHẬN ĐÃ NHẬN HÀNG
  // delivered -> completed
  // ======================================================
  const handleComplete = async (orderId) => {
    const confirmed = window.confirm(
      "Xác nhận bạn đã nhận được sách và hài lòng với đơn hàng này?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(`complete-${orderId}`);

      const response = await api.patch(`/api/orders/${orderId}/complete`);

      alert(response.data.message || "Đã xác nhận nhận hàng thành công.");

      await loadOrders();
    } catch (requestError) {
      console.error("Lỗi xác nhận nhận hàng:", requestError);

      alert(
        requestError.response?.data?.message ||
          "Không thể xác nhận đã nhận hàng.",
      );
    } finally {
      setActionLoading("");
    }
  };

  // ======================================================
  // HỦY HOẶC TỪ CHỐI ĐƠN
  // ======================================================
  const handleCancel = async (orderId) => {
    const message =
      activeTab === "sell"
        ? "Bạn có chắc muốn từ chối đơn hàng này không?"
        : "Bạn có chắc muốn hủy đơn hàng này không?";

    const confirmed = window.confirm(message);

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(`cancel-${orderId}`);

      const response = await api.patch(`/api/orders/${orderId}/cancel`);

      alert(response.data.message || "Xử lý đơn hàng thành công.");

      await loadOrders();
    } catch (requestError) {
      console.error("Lỗi hủy đơn:", requestError);

      alert(
        requestError.response?.data?.message || "Không thể xử lý đơn hàng.",
      );
    } finally {
      setActionLoading("");
    }
  };

  // ======================================================
  // XEM TIMELINE VẬN CHUYỂN
  // ======================================================
  const handleOpenTracking = async (order) => {
    try {
      setSelectedTrackingOrder(order);
      setShowTrackingModal(true);
      setTrackingLoading(true);
      setTrackingError("");
      setTrackingData(null);

      const response = await api.get(`/api/orders/${order._id}/tracking`);

      setTrackingData(response.data);
    } catch (requestError) {
      console.error("Lỗi lấy lịch sử vận chuyển:", requestError);

      setTrackingError(
        requestError.response?.data?.message ||
          "Không thể tải lịch sử vận chuyển của đơn hàng.",
      );
    } finally {
      setTrackingLoading(false);
    }
  };

  const closeTrackingModal = () => {
    setShowTrackingModal(false);
    setSelectedTrackingOrder(null);
    setTrackingData(null);
    setTrackingError("");
  };

  // ======================================================
  // FORMAT ĐỊA CHỈ NHẬN HÀNG
  // ======================================================
  const formatShippingAddress = (shippingAddress) => {
    if (!shippingAddress) {
      return "Chưa có địa chỉ nhận hàng";
    }

    return [
      shippingAddress.addressLine,
      shippingAddress.ward,
      shippingAddress.province,
    ]
      .filter(Boolean)
      .join(", ");
  };

  // ======================================================
  // MỞ POPUP ĐÁNH GIÁ
  // ======================================================
  const handleOpenReview = (order) => {
    setSelectedReviewOrder(order);
  };

  const handleReviewSuccess = async () => {
    setSelectedReviewOrder(null);
    await loadOrders();
  };

  const currentOrders = activeTab === "buy" ? buyOrders : sellOrders;

  const getStatusInfo = (status) => {
    return (
      statusMap[status] || {
        label: status || "Không xác định",

        className: "bg-gray-100 text-gray-700",
      }
    );
  };

  // ĐÃ SỬA: Order giờ chứa nhiều sách qua items[] thay vì 1 bookId
  // duy nhất. getBookImage nhận thẳng book đã populate của từng item.
  const getBookImage = (book) => {
    return book?.images?.[0] || getPlaceholderImage(120, 160, "Sách");
  };

  // Tóm tắt tên đơn hàng — dùng cho tiêu đề popup (timeline/vận chuyển)
  const summarizeOrderTitle = (order) => {
    const items = order?.items || [];

    if (items.length === 0) {
      return "Đơn hàng";
    }

    if (items.length === 1) {
      return items[0].title || "Sách không còn tồn tại";
    }

    return `${items.length} loại sách`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C92127]" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#F5F5F5] py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
            {/* Tiêu đề */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Quản lý đơn hàng
                </h1>

                <p className="text-sm text-gray-500 mt-1">
                  Theo dõi và xử lý các giao dịch mua bán sách.
                </p>
              </div>

              <button
                type="button"
                onClick={loadOrders}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Làm mới
              </button>
            </div>

            {/* Tab */}
            <div className="flex overflow-x-auto border-b mb-6">
              <button
                type="button"
                onClick={() => setActiveTab("buy")}
                className={`px-5 py-3 whitespace-nowrap font-semibold text-sm border-b-2 ${
                  activeTab === "buy"
                    ? "border-[#C92127] text-[#C92127]"
                    : "border-transparent text-gray-500"
                }`}
              >
                Đơn tôi mua ({buyOrders.length})
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab("sell")}
                  className={`px-5 py-3 whitespace-nowrap font-semibold text-sm border-b-2 ${
                    activeTab === "sell"
                      ? "border-[#C92127] text-[#C92127]"
                      : "border-transparent text-gray-500"
                  }`}
                >
                  Đơn tôi bán ({sellOrders.length})
                </button>
              )}
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 bg-red-50 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {currentOrders.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-5xl mb-4">📦</div>

                <p className="text-gray-700 font-semibold">Chưa có đơn hàng</p>

                <p className="text-gray-500 text-sm mt-1">
                  Các đơn hàng mới sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentOrders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);

                  const accepting = actionLoading === `accept-${order._id}`;

                  const cancelling = actionLoading === `cancel-${order._id}`;

                  const preparing = actionLoading === `prepare-${order._id}`;

                  const confirmingPayment =
                    actionLoading === `confirm-payment-${order._id}`;

                  const shipping =
                    actionLoading === `ship-${order._id}` ||
                    actionLoading === `shipping-update-${order._id}`;

                  const delivering = actionLoading === `deliver-${order._id}`;

                  const completing = actionLoading === `complete-${order._id}`;

                  const processing =
                    accepting ||
                    cancelling ||
                    preparing ||
                    confirmingPayment ||
                    shipping ||
                    delivering ||
                    completing;

                  // Đơn đã duyệt nhưng chưa thanh toán — "!== paid" để
                  // đơn cũ (không có field paymentStatus) cũng coi là
                  // chưa thanh toán.
                  const awaitingPayment =
                    order.status === "confirmed" &&
                    order.paymentStatus !== "paid";

                  return (
                    <div
                      key={order._id}
                      className="border border-gray-200 rounded-xl p-4"
                    >
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            {/* ĐÃ SỬA: 1 đơn giờ có thể chứa nhiều sách
                                (items[]) thay vì 1 sách duy nhất — hiển
                                thị danh sách thay vì 1 ảnh/tên/giá đơn. */}
                            <div className="flex-1 space-y-3">
                              {(order.items || []).map((item, index) => {
                                const book = item.bookId;

                                return (
                                  <div
                                    key={
                                      book?._id ||
                                      `${order._id}-item-${index}`
                                    }
                                    className="flex gap-3"
                                  >
                                    <img
                                      src={getBookImage(book)}
                                      alt={item.title || "Sách"}
                                      className="w-16 h-20 object-cover rounded-lg border border-gray-200 shrink-0"
                                    />

                                    <div className="min-w-0">
                                      <h2 className="text-base font-semibold text-gray-900 line-clamp-2">
                                        {item.title ||
                                          "Sách không còn tồn tại"}
                                      </h2>

                                      <p className="mt-1 text-sm text-gray-600">
                                        Đơn giá:{" "}
                                        <span className="font-semibold text-gray-800">
                                          {Number(
                                            item.price || 0,
                                          ).toLocaleString("vi-VN")}{" "}
                                          đ
                                        </span>{" "}
                                        × {item.quantity || 1}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}

                              <p className="text-[#C92127] font-bold">
                                Tổng:{" "}
                                {Number(order.totalPrice || 0).toLocaleString(
                                  "vi-VN",
                                )}{" "}
                                đ
                              </p>
                            </div>

                            <span
                              className={`self-start px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.className}`}
                            >
                              {statusInfo.label}
                            </span>
                          </div>

                          <div className="mt-3 text-sm text-gray-600 space-y-1">
                            {activeTab === "buy" ? (
                              <>
                                <p>
                                  Người bán:{" "}
                                  <span className="font-medium text-gray-800">
                                    {order.sellerId?.fullName ||
                                      "Chưa cập nhật"}
                                  </span>
                                </p>

                                <p>
                                  Trường:{" "}
                                  {order.sellerId?.university ||
                                    "Chưa cập nhật"}
                                </p>

                                {order.sellerId?.phoneNumber && (
                                  <p>
                                    Số điện thoại: {order.sellerId.phoneNumber}
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <p>
                                  Người mua:{" "}
                                  <span className="font-medium text-gray-800">
                                    {order.buyerId?.fullName || "Chưa cập nhật"}
                                  </span>
                                </p>

                                <p>
                                  Trường:{" "}
                                  {order.buyerId?.university || "Chưa cập nhật"}
                                </p>

                                {order.buyerId?.phoneNumber && (
                                  <p>
                                    Số điện thoại: {order.buyerId.phoneNumber}
                                  </p>
                                )}
                              </>
                            )}

                            {order.shippingAddress && (
                              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                <p className="font-semibold text-gray-800">
                                  📍 Thông tin nhận hàng
                                </p>

                                <p className="mt-1">
                                  Người nhận:{" "}
                                  <span className="font-medium text-gray-800">
                                    {order.shippingAddress.receiverName ||
                                      "Chưa cập nhật"}
                                  </span>
                                </p>

                                <p>
                                  Số điện thoại:{" "}
                                  {order.shippingAddress.phoneNumber ||
                                    "Chưa cập nhật"}
                                </p>

                                <p>
                                  Địa chỉ:{" "}
                                  {formatShippingAddress(order.shippingAddress)}
                                </p>

                                {order.shippingAddress.note && (
                                  <p>Ghi chú: {order.shippingAddress.note}</p>
                                )}
                              </div>
                            )}

                            <p className="pt-1">
                              Ngày đặt:{" "}
                              {order.createdAt
                                ? new Date(order.createdAt).toLocaleString(
                                    "vi-VN",
                                  )
                                : "Không xác định"}
                            </p>

                            <button
                              type="button"
                              onClick={() => handleOpenTracking(order)}
                              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              🧭 Xem hành trình đơn hàng
                            </button>
                          </div>

                          {/* Đơn đang chờ */}
                          {order.status === "pending" && (
                            <div className="flex flex-wrap gap-3 mt-4">
                              {activeTab === "sell" && (
                                <button
                                  type="button"
                                  disabled={processing}
                                  onClick={() => handleAccept(order._id)}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {accepting ? "Đang duyệt..." : "Duyệt đơn"}
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={processing}
                                onClick={() => handleCancel(order._id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {cancelling
                                  ? "Đang xử lý..."
                                  : activeTab === "sell"
                                    ? "Từ chối"
                                    : "Hủy đơn"}
                              </button>
                            </div>
                          )}

                          {/* NGƯỜI MUA - ĐƠN ĐÃ DUYỆT, CẦN THANH TOÁN QR */}
                          {awaitingPayment && activeTab === "buy" && (
                            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                              <p className="font-semibold text-blue-800">
                                💳 Vui lòng thanh toán
                              </p>

                              {order.paymentQrUrl && (
                                <img
                                  src={order.paymentQrUrl}
                                  alt="QR chuyển khoản"
                                  className="mt-3 w-48 rounded-lg border border-blue-200 bg-white"
                                />
                              )}

                              <p className="mt-3 text-sm text-gray-700">
                                Số tiền:{" "}
                                <span className="font-semibold">
                                  {Number(order.totalPrice || 0).toLocaleString(
                                    "vi-VN",
                                  )}{" "}
                                  đ
                                </span>
                              </p>

                              {order.paymentContent && (
                                <p className="text-sm text-gray-700">
                                  Nội dung chuyển khoản:{" "}
                                  <span className="font-semibold">
                                    {order.paymentContent}
                                  </span>
                                </p>
                              )}

                              <p className="mt-2 text-xs text-gray-500">
                                Admin sẽ xác nhận sau khi nhận được tiền, vui
                                lòng không đổi nội dung chuyển khoản.
                              </p>
                            </div>
                          )}

                          {/* NGƯỜI MUA - ĐÃ THANH TOÁN, CHỜ CHUẨN BỊ */}
                          {order.status === "confirmed" &&
                            !awaitingPayment &&
                            activeTab === "buy" && (
                              <div className="mt-4 text-sm font-medium text-green-700">
                                ✅ Đã thanh toán — đang chờ chuẩn bị hàng.
                              </div>
                            )}

                          {/* ADMIN - ĐƠN ĐÃ XÁC NHẬN, CHỜ THANH TOÁN */}
                          {awaitingPayment && activeTab === "sell" && (
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              <span className="text-sm font-medium text-orange-600">
                                ⏳ Đang chờ khách thanh toán
                              </span>

                              <button
                                type="button"
                                disabled={processing}
                                onClick={() => handleConfirmPayment(order._id)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {confirmingPayment
                                  ? "Đang xử lý..."
                                  : "✅ Xác nhận đã nhận tiền"}
                              </button>
                            </div>
                          )}

                          {/* ADMIN - ĐÃ THANH TOÁN, CHỜ CHUẨN BỊ HÀNG */}
                          {order.status === "confirmed" &&
                            !awaitingPayment &&
                            activeTab === "sell" && (
                              <div className="mt-4">
                                <button
                                  type="button"
                                  disabled={processing}
                                  onClick={() => handlePrepare(order._id)}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {preparing
                                    ? "Đang xử lý..."
                                    : "📦 Chuẩn bị hàng"}
                                </button>
                              </div>
                            )}

                          {/* ADMIN - ĐƠN ĐANG CHUẨN BỊ */}
                          {order.status === "preparing" &&
                            activeTab === "sell" && (
                              <div className="mt-4">
                                <button
                                  type="button"
                                  disabled={processing}
                                  onClick={() =>
                                    openShippingModal(order, "start")
                                  }
                                  className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  🚚 Bắt đầu giao
                                </button>
                              </div>
                            )}

                          {/* ĐƠN ĐANG GIAO */}
                          {order.status === "shipping" && (
                            <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">🚚</span>

                                <p className="font-bold text-orange-700">
                                  Đang giao hàng
                                </p>
                              </div>

                              <div className="mt-3 space-y-2 text-sm text-gray-700">
                                <p>
                                  <span className="font-semibold">
                                    Đơn vị vận chuyển:
                                  </span>{" "}
                                  {order.shippingProvider || "Chưa cập nhật"}
                                </p>

                                <p>
                                  <span className="font-semibold">
                                    Mã vận đơn:
                                  </span>{" "}
                                  {order.trackingCode || "Chưa cập nhật"}
                                </p>

                                <p>
                                  <span className="font-semibold">
                                    Dự kiến giao:
                                  </span>{" "}
                                  {order.estimatedDeliveryDate
                                    ? new Date(
                                        order.estimatedDeliveryDate,
                                      ).toLocaleDateString("vi-VN")
                                    : "Chưa cập nhật"}
                                </p>

                                <p>
                                  <span className="font-semibold">
                                    Trạng thái hiện tại:
                                  </span>{" "}
                                  {order.shippingNote || "Đang vận chuyển"}
                                </p>
                              </div>

                              {activeTab === "sell" && (
                                <div className="mt-4 flex flex-wrap gap-3">
                                  <button
                                    type="button"
                                    disabled={processing}
                                    onClick={() =>
                                      openShippingModal(order, "update")
                                    }
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    📝 Cập nhật vận chuyển
                                  </button>

                                  <button
                                    type="button"
                                    disabled={processing}
                                    onClick={() => handleDeliver(order._id)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {delivering ? "Đang xử lý..." : "✓ Đã giao"}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* ĐƠN ĐÃ GIAO */}
                          {order.status === "delivered" && (
                            <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                              <p className="font-semibold text-cyan-700">
                                📬 Đơn hàng đã được giao
                              </p>

                              {activeTab === "buy" ? (
                                <>
                                  <p className="mt-2 text-sm text-gray-600">
                                    Sách đã được giao. Vui lòng kiểm tra hàng
                                    trước khi xác nhận đã nhận.
                                  </p>

                                  <button
                                    type="button"
                                    disabled={processing}
                                    onClick={() => handleComplete(order._id)}
                                    className="mt-3 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-semibold hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {completing
                                      ? "Đang xác nhận..."
                                      : "✓ Xác nhận đã nhận hàng"}
                                  </button>
                                </>
                              ) : (
                                <p className="mt-2 text-sm text-gray-600">
                                  Đang chờ người mua xác nhận đã nhận được sách.
                                </p>
                              )}
                            </div>
                          )}

                          {/* ĐƠN HOÀN THÀNH */}
                          {order.status === "completed" && (
                            <div className="mt-4">
                              {activeTab === "buy" ? (
                                order.hasReview ? (
                                  <span className="inline-flex px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                                    ✓ Đã đánh giá
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReview(order)}
                                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600"
                                  >
                                    ★ Đánh giá
                                  </button>
                                )
                              ) : (
                                <div className="text-sm text-green-700 font-medium">
                                  Giao dịch đã được xác nhận.
                                </div>
                              )}
                            </div>
                          )}

                          {order.status === "cancelled" && (
                            <div className="mt-4 text-sm text-red-600 font-medium">
                              Đơn hàng này đã bị hủy.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================
          POPUP TIMELINE VẬN CHUYỂN
      ================================================== */}
      {showTrackingModal && selectedTrackingOrder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-white px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Theo dõi đơn hàng
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  {summarizeOrderTitle(selectedTrackingOrder)}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Mã đơn: {selectedTrackingOrder?._id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeTrackingModal}
                className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {trackingLoading ? (
                <div className="flex min-h-52 items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
                </div>
              ) : trackingError ? (
                <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  {trackingError}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        Trạng thái hiện tại
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {getStatusInfo(trackingData?.currentStatus).label}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        Dự kiến giao
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        {trackingData?.estimatedDeliveryDate
                          ? new Date(
                              trackingData.estimatedDeliveryDate,
                            ).toLocaleDateString("vi-VN")
                          : "Chưa cập nhật"}
                      </p>
                    </div>
                  </div>

                  {(trackingData?.shippingProvider ||
                    trackingData?.trackingCode) && (
                    <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-gray-700">
                      <p>
                        <span className="font-semibold">
                          Đơn vị vận chuyển:
                        </span>{" "}
                        {trackingData?.shippingProvider || "Chưa cập nhật"}
                      </p>

                      <p className="mt-1">
                        <span className="font-semibold">Mã vận đơn:</span>{" "}
                        {trackingData?.trackingCode || "Chưa cập nhật"}
                      </p>
                    </div>
                  )}

                  <div className="mt-6">
                    <h3 className="text-base font-bold text-gray-900">
                      Hành trình đơn hàng
                    </h3>

                    {Array.isArray(trackingData?.tracking) &&
                    trackingData.tracking.length > 0 ? (
                      <div className="mt-4">
                        {trackingData.tracking.map((item, index) => {
                          const isLast =
                            index === trackingData.tracking.length - 1;

                          return (
                            <div
                              key={item._id || `${item.status}-${index}`}
                              className="relative flex gap-4 pb-6"
                            >
                              {!isLast && (
                                <div className="absolute left-[11px] top-6 h-full w-0.5 bg-blue-100" />
                              )}

                              <div className="relative z-[1] mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-blue-100 bg-blue-600" />

                              <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white p-4">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                  <p className="font-bold text-gray-900">
                                    {item.title ||
                                      getStatusInfo(item.status).label}
                                  </p>

                                  <span className="text-xs text-gray-500">
                                    {item.createdAt
                                      ? new Date(item.createdAt).toLocaleString(
                                          "vi-VN",
                                        )
                                      : ""}
                                  </span>
                                </div>

                                {item.location && (
                                  <p className="mt-2 text-sm font-medium text-blue-700">
                                    📍 {item.location}
                                  </p>
                                )}

                                {item.note && (
                                  <p className="mt-2 text-sm leading-6 text-gray-600">
                                    {item.note}
                                  </p>
                                )}

                                {(item.shippingProvider ||
                                  item.trackingCode) && (
                                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                                    {item.shippingProvider && (
                                      <span>
                                        Đơn vị: {item.shippingProvider}
                                      </span>
                                    )}

                                    {item.trackingCode && (
                                      <span>
                                        Mã vận đơn: {item.trackingCode}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl bg-gray-50 p-5 text-sm text-gray-500">
                        Chưa có lịch sử vận chuyển cho đơn hàng này.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ReviewModal
        isOpen={Boolean(selectedReviewOrder)}
        order={selectedReviewOrder}
        onClose={() => setSelectedReviewOrder(null)}
        onSuccess={handleReviewSuccess}
      />

      {/* ==================================================
          POPUP BẮT ĐẦU GIAO / CẬP NHẬT VẬN CHUYỂN
      ================================================== */}
      {showShippingModal && selectedShippingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                  {shippingMode === "start"
                    ? "Bắt đầu giao hàng"
                    : "Cập nhật vận chuyển"}
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  {summarizeOrderTitle(selectedShippingOrder)}
                </h2>
              </div>

              <button
                type="button"
                disabled={Boolean(actionLoading)}
                onClick={closeShippingModal}
                className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmitShipping} className="p-6">
              <div className="grid grid-cols-1 gap-5">
                {/* ĐƠN VỊ VẬN CHUYỂN */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Đơn vị vận chuyển
                    {shippingMode === "start" && (
                      <span className="text-red-500"> *</span>
                    )}
                  </label>

                  <input
                    type="text"
                    name="shippingProvider"
                    value={shippingForm.shippingProvider}
                    onChange={handleShippingFormChange}
                    placeholder="Ví dụ: Giao Hàng Nhanh, Viettel Post..."
                    className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-orange-500"
                  />
                </div>

                {/* MÃ VẬN ĐƠN */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Mã vận đơn
                    {shippingMode === "start" && (
                      <span className="text-red-500"> *</span>
                    )}
                  </label>

                  <input
                    type="text"
                    name="trackingCode"
                    value={shippingForm.trackingCode}
                    onChange={handleShippingFormChange}
                    placeholder="Ví dụ: VN123456789"
                    className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-orange-500"
                  />
                </div>

                {/* NGÀY DỰ KIẾN GIAO */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Ngày dự kiến giao
                    {shippingMode === "start" && (
                      <span className="text-red-500"> *</span>
                    )}
                  </label>

                  <input
                    type="date"
                    name="estimatedDeliveryDate"
                    value={shippingForm.estimatedDeliveryDate}
                    onChange={handleShippingFormChange}
                    className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-orange-500"
                  />
                </div>

                {/* VỊ TRÍ HIỆN TẠI */}
                {shippingMode === "update" && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Vị trí hiện tại
                    </label>

                    <input
                      type="text"
                      name="location"
                      value={shippingForm.location}
                      onChange={handleShippingFormChange}
                      placeholder="Ví dụ: Bưu cục Trà Vinh"
                      className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-orange-500"
                    />
                  </div>
                )}

                {/* GHI CHÚ */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    {shippingMode === "update"
                      ? "Tình trạng / ghi chú vận chuyển"
                      : "Ghi chú vận chuyển"}
                  </label>

                  <textarea
                    name="shippingNote"
                    value={shippingForm.shippingNote}
                    onChange={handleShippingFormChange}
                    rows={3}
                    placeholder={
                      shippingMode === "update"
                        ? "Ví dụ: Đơn đang trên đường giao đến người nhận..."
                        : "Ví dụ: Giao trong giờ hành chính..."
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* BUTTON */}
              <div className="mt-6 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={Boolean(actionLoading)}
                  onClick={closeShippingModal}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={Boolean(actionLoading)}
                  className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading
                    ? "Đang xử lý..."
                    : shippingMode === "start"
                      ? "🚚 Xác nhận bắt đầu giao"
                      : "📝 Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Orders;
