import React, { useEffect, useState } from "react";

import api from "../services/api";

const Shop = () => {
  const [shop, setShop] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    const loadShop = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/api/shop");

        setShop(response.data.shop);
      } catch (requestError) {
        console.error("Lỗi lấy shop:", requestError);

        setError(
          requestError.response?.data?.message ||
            "Không thể tải thông tin cửa hàng.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadShop();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
        <div className="w-10 h-10 border-4 border-[#C92127] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4] px-4">
        <div className="bg-white rounded-xl shadow-sm p-6 text-gray-600">
          {error || "Chưa có thông tin cửa hàng."}
        </div>
      </div>
    );
  }

  const fullAddress = [shop.addressLine, shop.ward, shop.province]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen bg-[#F8F7F4] py-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
          {/* HEADER */}
          <div className="bg-[#C92127] px-6 md:px-10 py-10 text-white">
            <p className="text-sm font-semibold uppercase tracking-widest opacity-80">
              Cửa hàng sách sinh viên
            </p>

            <h1 className="mt-2 text-3xl md:text-4xl font-bold">
              🏪 {shop.shopName}
            </h1>

            {shop.description && (
              <p className="mt-4 max-w-2xl leading-7 text-red-50">
                {shop.description}
              </p>
            )}
          </div>

          <div className="p-6 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* ADDRESS */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500">📍 Địa chỉ cửa hàng</p>

                <p className="mt-2 font-semibold text-gray-900 leading-7">
                  {fullAddress || "Đang cập nhật"}
                </p>
              </div>

              {/* PHONE */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500">☎ Số điện thoại</p>

                <p className="mt-2 font-semibold text-gray-900">
                  {shop.phoneNumber || "Đang cập nhật"}
                </p>
              </div>

              {/* OPEN */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500">🕒 Giờ mở cửa</p>

                <p className="mt-2 font-semibold text-gray-900">
                  {shop.openingHours || "Đang cập nhật"}
                </p>
              </div>

              {/* EMAIL */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500">✉ Email liên hệ</p>

                <p className="mt-2 font-semibold text-gray-900">
                  {shop.email || "Đang cập nhật"}
                </p>
              </div>
            </div>

            {shop.directPurchaseEnabled && (
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6">
                <h2 className="text-lg font-bold text-green-800">
                  ✅ Có thể mua trực tiếp tại cửa hàng
                </h2>

                <p className="mt-2 text-sm leading-6 text-green-700">
                  Bạn có thể đến trực tiếp cửa hàng để xem sách và mua mà không
                  cần đặt hàng online.
                </p>
              </div>
            )}

            <div className="mt-8 rounded-2xl bg-gray-50 p-6">
              <h2 className="text-lg font-bold text-gray-900">
                📚 Mua sách tại Sách SV
              </h2>

              <p className="mt-2 text-sm leading-7 text-gray-600">
                Bạn có thể lựa chọn đặt sách online để giao tận nơi hoặc đến
                trực tiếp cửa hàng để xem và mua sách.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
