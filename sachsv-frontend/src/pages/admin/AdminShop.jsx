import React, { useEffect, useState } from "react";

import api from "../../services/api";

const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#C92127] focus:border-[#C92127]";

const AdminShop = () => {
  const [formData, setFormData] = useState({
    shopName: "Sách SV",
    description: "",
    phoneNumber: "",
    email: "",
    addressLine: "",
    ward: "",
    province: "",
    openingHours: "07:30 - 21:00",
    directPurchaseEnabled: true,
    isActive: true,
  });

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  // ======================================================
  // LOAD SHOP
  // ======================================================
  useEffect(() => {
    const loadShop = async () => {
      try {
        setLoading(true);

        const response = await api.get("/api/shop/admin");

        const shop = response.data.shop;

        if (shop) {
          setFormData({
            shopName: shop.shopName || "Sách SV",

            description: shop.description || "",

            phoneNumber: shop.phoneNumber || "",

            email: shop.email || "",

            addressLine: shop.addressLine || "",

            ward: shop.ward || "",

            province: shop.province || "",

            openingHours: shop.openingHours || "07:30 - 21:00",

            directPurchaseEnabled: shop.directPurchaseEnabled !== false,

            isActive: shop.isActive !== false,
          });
        }
      } catch (error) {
        console.error("Lỗi lấy thông tin shop:", error);
      } finally {
        setLoading(false);
      }
    };

    loadShop();
  }, []);

  // ======================================================
  // INPUT CHANGE
  // ======================================================
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,

      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ======================================================
  // SAVE
  // ======================================================
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.shopName.trim()) {
      alert("Vui lòng nhập tên cửa hàng.");
      return;
    }

    if (!formData.phoneNumber.trim()) {
      alert("Vui lòng nhập số điện thoại.");
      return;
    }

    if (!formData.addressLine.trim()) {
      alert("Vui lòng nhập địa chỉ cửa hàng.");
      return;
    }

    if (!formData.ward.trim()) {
      alert("Vui lòng nhập Phường/Xã.");
      return;
    }

    if (!formData.province.trim()) {
      alert("Vui lòng nhập Tỉnh/Thành phố.");
      return;
    }

    try {
      setSaving(true);

      const response = await api.put("/api/shop/admin", formData);

      alert(response.data.message || "Lưu cửa hàng thành công.");
    } catch (error) {
      console.error("Lỗi lưu shop:", error);

      alert(
        error.response?.data?.message || "Không thể lưu thông tin cửa hàng.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="w-10 h-10 border-4 border-[#C92127] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Quản lý cửa hàng</h1>

          <p className="mt-1 text-sm text-gray-500">
            Thông tin này sẽ được hiển thị công khai cho người mua.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* SHOP NAME */}
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-semibold">
                Tên cửa hàng
              </label>

              <input
                type="text"
                name="shopName"
                value={formData.shopName}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            {/* PHONE */}
            <div>
              <label className="block mb-2 text-sm font-semibold">
                Số điện thoại
              </label>

              <input
                type="text"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className={inputClass}
                placeholder="0909 xxx xxx"
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="block mb-2 text-sm font-semibold">Email</label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={inputClass}
                placeholder="shop@gmail.com"
              />
            </div>

            {/* ADDRESS */}
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-semibold">
                Số nhà / Đường / Khóm - Ấp
              </label>

              <input
                type="text"
                name="addressLine"
                value={formData.addressLine}
                onChange={handleChange}
                className={inputClass}
                placeholder="212B Nguyễn Trãi"
              />
            </div>

            {/* WARD */}
            <div>
              <label className="block mb-2 text-sm font-semibold">
                Phường / Xã
              </label>

              <input
                type="text"
                name="ward"
                value={formData.ward}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            {/* PROVINCE */}
            <div>
              <label className="block mb-2 text-sm font-semibold">
                Tỉnh / Thành phố
              </label>

              <input
                type="text"
                name="province"
                value={formData.province}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            {/* OPENING */}
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-semibold">
                Giờ mở cửa
              </label>

              <input
                type="text"
                name="openingHours"
                value={formData.openingHours}
                onChange={handleChange}
                className={inputClass}
                placeholder="07:30 - 21:00"
              />
            </div>

            {/* DESCRIPTION */}
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-semibold">
                Giới thiệu cửa hàng
              </label>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                className={`${inputClass} resize-none`}
                placeholder="Giới thiệu về cửa hàng Sách SV..."
              />
            </div>

            {/* DIRECT PURCHASE */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="directPurchaseEnabled"
                  checked={formData.directPurchaseEnabled}
                  onChange={handleChange}
                  className="w-5 h-5 accent-[#C92127]"
                />

                <span className="font-medium text-gray-700">
                  Cho phép khách đến mua trực tiếp tại cửa hàng
                </span>
              </label>
            </div>

            {/* ACTIVE */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="w-5 h-5 accent-[#C92127]"
                />

                <span className="font-medium text-gray-700">
                  Hiển thị cửa hàng công khai
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-5 border-t">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-[#C92127] text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Lưu thông tin cửa hàng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminShop;
