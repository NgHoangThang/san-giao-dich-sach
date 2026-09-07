import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../services/api";
import Toast from "../components/Toast";
import { getPlaceholderImage } from "../utils/placeholderImage";

const formatPrice = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

const Cart = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");

  const [toast, setToast] = useState(null);

  // ======================================================
  // THANH TOÁN — CHỌN ĐỊA CHỈ NHẬN HÀNG
  // ======================================================
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);

  // ======================================================
  // LẤY GIỎ HÀNG
  // ======================================================
  const loadCart = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/cart");

      setItems(response.data.items || []);
      setSubtotal(response.data.subtotal || 0);
    } catch (requestError) {
      console.error("Lỗi lấy giỏ hàng:", requestError);

      setError(
        requestError.response?.data?.message || "Không thể tải giỏ hàng.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  // Tính lại tạm tính từ danh sách item cục bộ — dùng để cập nhật
  // ngay trên UI mà không cần gọi lại loadCart() (tránh nháy spinner
  // toàn trang mỗi lần bấm +/-/Xóa).
  const computeSubtotal = (itemsList) =>
    itemsList.reduce(
      (sum, item) =>
        item.unavailable ? sum : sum + item.book.price * item.quantity,
      0,
    );

  // ======================================================
  // SỬA SỐ LƯỢNG
  // ------------------------------------------------------
  // ĐÃ SỬA: trước đây gọi lại loadCart() sau mỗi lần sửa, bật lại
  // "loading" khiến cả trang chớp qua spinner to đùng che hết nội
  // dung — giật cục. Giờ cập nhật ngay trên state cục bộ (optimistic
  // update), chỉ gọi lại loadCart() để đồng bộ lại khi có lỗi.
  // ======================================================
  const handleUpdateQuantity = async (bookId, nextQuantity) => {
    if (nextQuantity < 1) {
      return;
    }

    const previousItems = items;

    const nextItems = items.map((item) =>
      item.book._id === bookId ? { ...item, quantity: nextQuantity } : item,
    );

    setItems(nextItems);
    setSubtotal(computeSubtotal(nextItems));

    try {
      setActionLoadingId(bookId);

      await api.patch(`/api/cart/${bookId}`, { quantity: nextQuantity });

      window.dispatchEvent(new Event("cart:updated"));
    } catch (requestError) {
      console.error("Lỗi cập nhật số lượng:", requestError);

      // Lỗi thì trả lại đúng trạng thái cũ, không để UI sai lệch với server
      setItems(previousItems);
      setSubtotal(computeSubtotal(previousItems));

      setToast({
        message:
          requestError.response?.data?.message ||
          "Không thể cập nhật số lượng.",
        type: "error",
      });
    } finally {
      setActionLoadingId("");
    }
  };

  // ======================================================
  // XÓA 1 SÁCH KHỎI GIỎ
  // ======================================================
  const handleRemove = async (bookId) => {
    const previousItems = items;

    const nextItems = items.filter((item) => item.book._id !== bookId);

    setItems(nextItems);
    setSubtotal(computeSubtotal(nextItems));

    try {
      setActionLoadingId(bookId);

      await api.delete(`/api/cart/${bookId}`);

      window.dispatchEvent(new Event("cart:updated"));
    } catch (requestError) {
      console.error("Lỗi xóa khỏi giỏ hàng:", requestError);

      setItems(previousItems);
      setSubtotal(computeSubtotal(previousItems));

      setToast({
        message:
          requestError.response?.data?.message ||
          "Không thể xóa khỏi giỏ hàng.",
        type: "error",
      });
    } finally {
      setActionLoadingId("");
    }
  };

  // ======================================================
  // LẤY ĐỊA CHỈ ĐÃ LƯU CỦA USER
  // Cùng logic với "Mua ngay" ở BookDetail.jsx
  // ======================================================
  const loadAddresses = async () => {
    try {
      setAddressLoading(true);

      const response = await api.get("/api/addresses");

      const addressData = Array.isArray(response.data)
        ? response.data
        : response.data.addresses || [];

      setAddresses(addressData);

      const defaultAddress =
        addressData.find((address) => address.isDefault) || addressData[0];

      setSelectedAddressId(defaultAddress?._id || "");
    } catch (requestError) {
      console.error("Lỗi lấy địa chỉ nhận hàng:", requestError);

      setAddresses([]);
      setSelectedAddressId("");

      if (requestError.response?.status !== 403) {
        setToast({
          message:
            requestError.response?.data?.message ||
            "Không thể tải danh sách địa chỉ nhận hàng.",
          type: "error",
        });
      }
    } finally {
      setAddressLoading(false);
    }
  };

  const availableItems = items.filter((item) => !item.unavailable);

  // ======================================================
  // MỞ FORM THANH TOÁN
  // ======================================================
  const handleOpenCheckout = async () => {
    if (availableItems.length === 0) {
      setToast({
        message: "Giỏ hàng không có sách nào khả dụng để thanh toán.",
        type: "error",
      });
      return;
    }

    setShowCheckoutModal(true);

    await loadAddresses();
  };

  const closeCheckoutModal = () => {
    if (orderLoading) {
      return;
    }

    setShowCheckoutModal(false);
  };

  // ======================================================
  // XÁC NHẬN THANH TOÁN
  // Gộp toàn bộ sách còn khả dụng trong giỏ thành 1 Order (items[]),
  // xóa sạch giỏ hàng sau khi tạo đơn thành công.
  // ======================================================
  const handleSubmitOrder = async (event) => {
    event.preventDefault();

    if (orderLoading) {
      return;
    }

    const selectedAddress = addresses.find(
      (address) => String(address._id) === String(selectedAddressId),
    );

    if (!selectedAddress) {
      setToast({ message: "Vui lòng chọn địa chỉ nhận hàng.", type: "error" });
      return;
    }

    const { receiverName, phoneNumber, addressLine, ward, province, note } =
      selectedAddress;

    if (
      !receiverName?.trim() ||
      !phoneNumber?.trim() ||
      !addressLine?.trim() ||
      !ward?.trim() ||
      !province?.trim()
    ) {
      setToast({
        message:
          "Địa chỉ đã chọn đang thiếu thông tin. Vui lòng cập nhật lại trong Hồ sơ cá nhân.",
        type: "error",
      });
      return;
    }

    try {
      setOrderLoading(true);

      const response = await api.post("/api/orders/create", {
        items: availableItems.map((item) => ({
          bookId: item.book._id,
          quantity: item.quantity,
        })),

        shippingAddress: {
          receiverName: receiverName.trim(),
          phoneNumber: phoneNumber.trim(),
          addressLine: addressLine.trim(),
          ward: ward.trim(),
          province: province.trim(),
          note: note?.trim() || "",
        },
      });

      // Xóa sạch giỏ hàng sau khi đặt thành công — kể cả các item
      // "unavailable" không nằm trong đơn, vì chúng cũng không còn mua
      // được nữa nên không có lý do giữ lại trong giỏ.
      await api.delete("/api/cart");

      window.dispatchEvent(new Event("cart:updated"));

      setShowCheckoutModal(false);

      alert(
        response.data.message || "Đặt mua thành công! Đang chờ Admin xác nhận.",
      );

      navigate("/orders");
    } catch (requestError) {
      console.error("Lỗi đặt mua:", requestError);

      setToast({
        message:
          requestError.response?.data?.details ||
          requestError.response?.data?.message ||
          "Đặt mua thất bại.",
        type: "error",
      });
    } finally {
      setOrderLoading(false);
    }
  };

  // ======================================================
  // ĐANG TẢI
  // ======================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#C92127] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          🛒 Giỏ hàng của bạn
        </h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 px-4 text-center">
            <div className="text-5xl">🛒</div>

            <p className="mt-4 font-semibold text-gray-800">
              Giỏ hàng đang trống
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Hãy thêm sách bạn muốn mua vào giỏ hàng.
            </p>

            <Link
              to="/tat-ca-sach"
              className="mt-5 inline-block rounded-xl bg-[#C92127] px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
            >
              Xem tất cả sách
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* DANH SÁCH SÁCH TRONG GIỎ */}
            <div className="space-y-4">
              {items.map((item) => {
                const book = item.book;
                const image = book.images?.[0];

                return (
                  <div
                    key={book._id}
                    className={`flex gap-4 rounded-xl bg-white p-4 shadow-sm ${
                      item.unavailable ? "opacity-60" : ""
                    }`}
                  >
                    <img
                      src={
                        image ||
                        getPlaceholderImage(80, 100, "Sách")
                      }
                      alt={book.title}
                      className="h-24 w-16 shrink-0 rounded-lg border object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/books/${book._id}`}
                        className="font-semibold text-gray-900 hover:text-[#C92127] line-clamp-2"
                      >
                        {book.title}
                      </Link>

                      <p className="mt-1 text-[#C92127] font-bold">
                        {formatPrice(book.price)}
                      </p>

                      {item.unavailable && (
                        <p className="mt-1 text-xs font-semibold text-red-500">
                          Sách đã hết hàng hoặc không còn khả dụng
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-4">
                        <div className="flex items-center border border-gray-300 rounded">
                          <button
                            type="button"
                            disabled={actionLoadingId === book._id}
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                            onClick={() =>
                              handleUpdateQuantity(book._id, item.quantity - 1)
                            }
                          >
                            −
                          </button>

                          <span className="w-10 text-center text-sm font-medium">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            disabled={actionLoadingId === book._id}
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                            onClick={() =>
                              handleUpdateQuantity(book._id, item.quantity + 1)
                            }
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={actionLoadingId === book._id}
                          onClick={() => handleRemove(book._id)}
                          className="text-sm font-semibold text-gray-400 hover:text-[#C92127] disabled:opacity-40"
                        >
                          {actionLoadingId === book._id
                            ? "Đang xử lý..."
                            : "Xóa"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TỔNG KẾT */}
            <div className="h-fit rounded-xl bg-white p-5 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4">Tổng đơn</h2>

              <div className="flex justify-between text-sm text-gray-600">
                <span>Tạm tính</span>
                <span className="font-semibold text-gray-900">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <button
                type="button"
                disabled={availableItems.length === 0}
                onClick={handleOpenCheckout}
                className="mt-5 w-full rounded-xl bg-[#C92127] px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                Thanh toán
              </button>

              {availableItems.length === 0 && (
                <p className="mt-2 text-xs text-red-500">
                  Không có sách nào khả dụng để thanh toán.
                </p>
              )}

              {availableItems.length > 0 &&
                availableItems.length < items.length && (
                  <p className="mt-2 text-xs text-gray-400">
                    Chỉ {availableItems.length}/{items.length} sách khả dụng sẽ
                    được đặt mua.
                  </p>
                )}
            </div>
          </div>
        )}
      </div>

      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      {/* ==================================================
          POPUP THANH TOÁN — CHỌN ĐỊA CHỈ NHẬN HÀNG
          Cùng luồng "Đặt mua online" ở BookDetail.jsx, nhưng gộp
          nhiều sách (items[]) thay vì 1 sách duy nhất.
      ================================================== */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#C92127]">
                  Thanh toán giỏ hàng
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  Chọn địa chỉ nhận hàng
                </h2>
              </div>

              <button
                type="button"
                disabled={orderLoading}
                onClick={closeCheckoutModal}
                className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* DANH SÁCH SÁCH SẼ ĐẶT */}
            <div className="mx-6 mt-5 space-y-3 rounded-xl bg-gray-50 p-4">
              {availableItems.map((item) => (
                <div key={item.book._id} className="flex gap-3">
                  <img
                    src={
                      item.book.images?.[0] ||
                      getPlaceholderImage(60, 80, "Sách")
                    }
                    alt={item.book.title}
                    className="h-16 w-12 shrink-0 rounded-lg border object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 line-clamp-1">
                      {item.book.title}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      {formatPrice(item.book.price)} × {item.quantity}
                    </p>
                  </div>

                  <p className="shrink-0 font-bold text-[#C92127]">
                    {formatPrice(item.book.price * item.quantity)}
                  </p>
                </div>
              ))}

              <div className="flex justify-between border-t border-gray-200 pt-3 text-sm">
                <span className="font-semibold text-gray-700">Tạm tính</span>
                <span className="text-lg font-bold text-[#C92127]">
                  {formatPrice(
                    availableItems.reduce(
                      (sum, item) => sum + item.book.price * item.quantity,
                      0,
                    ),
                  )}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitOrder} className="p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Địa chỉ nhận hàng</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Chọn một địa chỉ bạn đã lưu trong hồ sơ.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowCheckoutModal(false);
                    navigate("/profile");
                  }}
                  className="shrink-0 rounded-lg border border-[#C92127] px-3.5 py-2 text-sm font-semibold text-[#C92127] transition hover:bg-red-50"
                >
                  + Quản lý địa chỉ
                </button>
              </div>

              {/* LOADING ADDRESS */}
              {addressLoading ? (
                <div className="flex items-center justify-center rounded-xl border border-gray-200 py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C92127] border-t-transparent" />
                </div>
              ) : addresses.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-5 py-10 text-center">
                  <div className="text-4xl">📍</div>

                  <p className="mt-3 font-bold text-gray-900">
                    Bạn chưa có địa chỉ nhận hàng
                  </p>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                    Hãy thêm địa chỉ trong Hồ sơ cá nhân trước khi thanh toán.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setShowCheckoutModal(false);
                      navigate("/profile");
                    }}
                    className="mt-5 rounded-xl bg-[#C92127] px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                  >
                    + Thêm địa chỉ nhận hàng
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => {
                    const isSelected =
                      String(selectedAddressId) === String(address._id);

                    const fullAddress = [
                      address.addressLine,
                      address.ward,
                      address.province,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <button
                        type="button"
                        key={address._id}
                        onClick={() => setSelectedAddressId(address._id)}
                        className={`w-full rounded-2xl border-2 p-4 text-left transition ${
                          isSelected
                            ? "border-[#C92127] bg-red-50/50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              isSelected
                                ? "border-[#C92127]"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <div className="h-2.5 w-2.5 rounded-full bg-[#C92127]" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-gray-900">
                                📍 {address.label || "Địa chỉ"}
                              </span>

                              {address.isDefault && (
                                <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-[#C92127]">
                                  Mặc định
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-sm font-semibold text-gray-800">
                              {address.receiverName}
                              <span className="mx-2 font-normal text-gray-300">
                                |
                              </span>
                              <span className="font-normal text-gray-600">
                                {address.phoneNumber}
                              </span>
                            </p>

                            <p className="mt-1.5 text-sm leading-6 text-gray-600">
                              {fullAddress}
                            </p>

                            {address.note && (
                              <p className="mt-1 text-xs text-gray-500">
                                Ghi chú: {address.note}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* GHI CHÚ SNAPSHOT */}
              {addresses.length > 0 && selectedAddressId && !addressLoading && (
                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-bold uppercase text-blue-600">
                    ℹ️ Lưu ý
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Địa chỉ đã chọn sẽ được lưu vào đơn hàng. Sau này bạn sửa
                    hoặc xóa địa chỉ trong hồ sơ thì đơn hàng cũ vẫn giữ nguyên
                    địa chỉ lúc đặt.
                  </p>
                </div>
              )}

              {/* BUTTON */}
              <div className="mt-6 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={orderLoading}
                  onClick={closeCheckoutModal}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={
                    orderLoading ||
                    addressLoading ||
                    addresses.length === 0 ||
                    !selectedAddressId
                  }
                  className="rounded-xl bg-[#C92127] px-6 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {orderLoading ? "Đang đặt hàng..." : "Xác nhận đặt hàng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
