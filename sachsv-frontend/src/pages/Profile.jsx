import React, { useEffect, useMemo, useState } from "react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const inputClass =
  "w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#C92127] focus:border-[#C92127]";

const emptyAddressForm = {
  label: "Nhà",
  receiverName: "",
  phoneNumber: "",
  addressLine: "",
  ward: "",
  province: "",
  note: "",
  isDefault: false,
};

const Profile = () => {
  const { updateUser } = useAuth();

  const [profile, setProfile] = useState(null);

  const [formData, setFormData] = useState({
    fullName: "",
    university: "",
    phoneNumber: "",
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [avatarFile, setAvatarFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [error, setError] = useState("");

  // ======================================================
  // ADDRESS
  // ======================================================
  const [addresses, setAddresses] = useState([]);

  const [addressLoading, setAddressLoading] = useState(true);

  const [addressActionLoading, setAddressActionLoading] = useState("");

  const [showAddressModal, setShowAddressModal] = useState(false);

  const [editingAddress, setEditingAddress] = useState(null);

  const [addressForm, setAddressForm] = useState(emptyAddressForm);

  // ======================================================
  // AVATAR PREVIEW
  // ======================================================
  const avatarPreview = useMemo(() => {
    if (!avatarFile) {
      return "";
    }

    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // ======================================================
  // LẤY HỒ SƠ
  // ======================================================
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/api/users/profile");

        const userData = response.data.user || response.data;

        setProfile(userData);

        setFormData({
          fullName: userData.fullName || "",
          university: userData.university || "",
          phoneNumber: userData.phoneNumber || "",
        });
      } catch (requestError) {
        console.error("Lỗi lấy hồ sơ:", requestError);

        setError(
          requestError.response?.data?.message ||
            "Không thể tải thông tin hồ sơ.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  // ======================================================
  // LẤY ĐỊA CHỈ
  // ======================================================
  const loadAddresses = async () => {
    try {
      setAddressLoading(true);

      const response = await api.get("/api/addresses");

      const data = Array.isArray(response.data)
        ? response.data
        : response.data.addresses || [];

      setAddresses(data);
    } catch (requestError) {
      console.error("Lỗi lấy địa chỉ:", requestError);
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  // ======================================================
  // PROFILE INPUT
  // ======================================================
  const handleProfileChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // ======================================================
  // PASSWORD INPUT
  // ======================================================
  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // ======================================================
  // ADDRESS INPUT
  // ======================================================
  const handleAddressChange = (event) => {
    const { name, value, type, checked } = event.target;

    setAddressForm((previous) => ({
      ...previous,

      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ======================================================
  // CẬP NHẬT HỒ SƠ
  // ======================================================
  const handleUpdateProfile = async (event) => {
    event.preventDefault();

    if (!formData.fullName.trim()) {
      alert("Họ và tên không được để trống.");

      return;
    }

    try {
      setProfileLoading(true);

      const response = await api.put("/api/users/profile", {
        fullName: formData.fullName.trim(),

        university: formData.university.trim(),

        phoneNumber: formData.phoneNumber.trim(),
      });

      const updatedUser = response.data.user || response.data;

      setProfile(updatedUser);

      updateUser(updatedUser);

      alert(response.data.message || "Cập nhật hồ sơ thành công.");
    } catch (requestError) {
      console.error("Lỗi cập nhật hồ sơ:", requestError);

      alert(
        requestError.response?.data?.message || "Không thể cập nhật hồ sơ.",
      );
    } finally {
      setProfileLoading(false);
    }
  };

  // ======================================================
  // UPLOAD AVATAR
  // ======================================================
  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      alert("Vui lòng chọn ảnh đại diện.");

      return;
    }

    const allowedTypes = ["image/jpeg", "image/png"];

    if (!allowedTypes.includes(avatarFile.type)) {
      alert("Chỉ chấp nhận ảnh JPG hoặc PNG.");

      return;
    }

    if (avatarFile.size > 5 * 1024 * 1024) {
      alert("Dung lượng ảnh không được vượt quá 5MB.");

      return;
    }

    try {
      setAvatarLoading(true);

      const avatarFormData = new FormData();

      avatarFormData.append("avatar", avatarFile);

      const response = await api.post(
        "/api/users/profile/avatar",

        avatarFormData,

        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const updatedUser = response.data.user || response.data;

      setProfile(updatedUser);

      updateUser(updatedUser);

      setAvatarFile(null);

      alert(response.data.message || "Cập nhật ảnh đại diện thành công.");
    } catch (requestError) {
      console.error("Lỗi upload avatar:", requestError);

      alert(
        requestError.response?.data?.message ||
          "Không thể cập nhật ảnh đại diện.",
      );
    } finally {
      setAvatarLoading(false);
    }
  };

  // ======================================================
  // ĐỔI MẬT KHẨU
  // ======================================================
  const handleChangePassword = async (event) => {
    event.preventDefault();

    const { oldPassword, newPassword, confirmPassword } = passwordData;

    if (!oldPassword || !newPassword || !confirmPassword) {
      alert("Vui lòng nhập đầy đủ thông tin mật khẩu.");

      return;
    }

    if (newPassword.length < 6) {
      alert("Mật khẩu mới phải có ít nhất 6 ký tự.");

      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Xác nhận mật khẩu mới không khớp.");

      return;
    }

    if (oldPassword === newPassword) {
      alert("Mật khẩu mới phải khác mật khẩu hiện tại.");

      return;
    }

    try {
      setPasswordLoading(true);

      const response = await api.put("/api/users/change-password", {
        oldPassword,
        newPassword,
      });

      alert(response.data.message || "Đổi mật khẩu thành công.");

      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (requestError) {
      console.error("Lỗi đổi mật khẩu:", requestError);

      alert(requestError.response?.data?.message || "Không thể đổi mật khẩu.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // ======================================================
  // MỞ POPUP THÊM ADDRESS
  // ======================================================
  const openCreateAddressModal = () => {
    setEditingAddress(null);

    setAddressForm({
      ...emptyAddressForm,

      receiverName: profile?.fullName || "",

      phoneNumber: profile?.phoneNumber || "",

      isDefault: addresses.length === 0,
    });

    setShowAddressModal(true);
  };

  // ======================================================
  // MỞ POPUP SỬA ADDRESS
  // ======================================================
  const openEditAddressModal = (address) => {
    setEditingAddress(address);

    setAddressForm({
      label: address.label || "Nhà",

      receiverName: address.receiverName || "",

      phoneNumber: address.phoneNumber || "",

      addressLine: address.addressLine || "",

      ward: address.ward || "",

      province: address.province || "",

      note: address.note || "",

      isDefault: Boolean(address.isDefault),
    });

    setShowAddressModal(true);
  };

  // ======================================================
  // ĐÓNG POPUP ADDRESS
  // ======================================================
  const closeAddressModal = () => {
    if (addressActionLoading) {
      return;
    }

    setShowAddressModal(false);

    setEditingAddress(null);

    setAddressForm(emptyAddressForm);
  };

  // ======================================================
  // LƯU ADDRESS
  // ======================================================
  const handleSubmitAddress = async (event) => {
    event.preventDefault();

    const {
      label,
      receiverName,
      phoneNumber,
      addressLine,
      ward,
      province,
      note,
      isDefault,
    } = addressForm;

    if (!receiverName.trim()) {
      alert("Vui lòng nhập họ tên người nhận.");

      return;
    }

    if (!phoneNumber.trim()) {
      alert("Vui lòng nhập số điện thoại.");

      return;
    }

    const phoneDigits = phoneNumber.replace(/\D/g, "");

    if (phoneDigits.length < 9 || phoneDigits.length > 11) {
      alert("Số điện thoại không hợp lệ.");

      return;
    }

    if (!addressLine.trim()) {
      alert("Vui lòng nhập số nhà / đường / khóm / ấp.");

      return;
    }

    if (!ward.trim()) {
      alert("Vui lòng nhập Phường/Xã.");

      return;
    }

    if (!province.trim()) {
      alert("Vui lòng nhập Tỉnh/Thành phố.");

      return;
    }

    const payload = {
      label: label.trim() || "Nhà",

      receiverName: receiverName.trim(),

      phoneNumber: phoneNumber.trim(),

      addressLine: addressLine.trim(),

      ward: ward.trim(),

      province: province.trim(),

      note: note.trim(),

      isDefault,
    };

    try {
      setAddressActionLoading(
        editingAddress ? `edit-${editingAddress._id}` : "create",
      );

      let response;

      if (editingAddress) {
        response = await api.patch(
          `/api/addresses/${editingAddress._id}`,

          payload,
        );
      } else {
        response = await api.post(
          "/api/addresses",

          payload,
        );
      }

      alert(
        response.data.message ||
          (editingAddress
            ? "Cập nhật địa chỉ thành công."
            : "Thêm địa chỉ thành công."),
      );

      setShowAddressModal(false);

      setEditingAddress(null);

      setAddressForm(emptyAddressForm);

      await loadAddresses();
    } catch (requestError) {
      console.error("Lỗi lưu địa chỉ:", requestError);

      alert(requestError.response?.data?.message || "Không thể lưu địa chỉ.");
    } finally {
      setAddressActionLoading("");
    }
  };

  // ======================================================
  // ĐẶT ĐỊA CHỈ MẶC ĐỊNH
  // ======================================================
  const handleSetDefaultAddress = async (addressId) => {
    try {
      setAddressActionLoading(`default-${addressId}`);

      const response = await api.patch(`/api/addresses/${addressId}/default`);

      alert(response.data.message || "Đã đặt địa chỉ mặc định.");

      await loadAddresses();
    } catch (requestError) {
      console.error("Lỗi đặt địa chỉ mặc định:", requestError);

      alert(
        requestError.response?.data?.message ||
          "Không thể đặt địa chỉ mặc định.",
      );
    } finally {
      setAddressActionLoading("");
    }
  };

  // ======================================================
  // XÓA ADDRESS
  // ======================================================
  const handleDeleteAddress = async (addressId) => {
    const confirmed = window.confirm("Bạn có chắc muốn xóa địa chỉ này không?");

    if (!confirmed) {
      return;
    }

    try {
      setAddressActionLoading(`delete-${addressId}`);

      const response = await api.delete(`/api/addresses/${addressId}`);

      alert(response.data.message || "Xóa địa chỉ thành công.");

      await loadAddresses();
    } catch (requestError) {
      console.error("Lỗi xóa địa chỉ:", requestError);

      alert(requestError.response?.data?.message || "Không thể xóa địa chỉ.");
    } finally {
      setAddressActionLoading("");
    }
  };

  // ======================================================
  // FORMAT ADDRESS
  // ======================================================
  const formatAddress = (address) => {
    return [address.addressLine, address.ward, address.province]
      .filter(Boolean)
      .join(", ");
  };

  // ======================================================
  // LOADING
  // ======================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#C92127] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
        <div className="bg-white p-6 rounded-xl shadow-sm text-red-600">
          {error || "Không tìm thấy thông tin người dùng."}
        </div>
      </div>
    );
  }

  const displayedAvatar = avatarPreview || profile.avatar;

  return (
    <>
      <div className="min-h-screen bg-[#F5F5F5] py-8">
        <div className="max-w-5xl mx-auto px-4">
          {/* ==================================================
              HEADER
          ================================================== */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>

            <p className="text-sm text-gray-500 mt-1">
              Quản lý thông tin tài khoản, địa chỉ nhận hàng và bảo mật.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
            {/* ==================================================
                LEFT
            ================================================== */}
            <div className="bg-white rounded-xl shadow-sm p-6 h-fit">
              <div className="flex flex-col items-center">
                {displayedAvatar ? (
                  <img
                    src={displayedAvatar}
                    alt="Ảnh đại diện"
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-100"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-red-50 border-4 border-gray-100 flex items-center justify-center text-4xl font-bold text-[#C92127]">
                    {profile.fullName?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}

                <h2 className="mt-4 text-xl font-bold text-gray-900 text-center">
                  {profile.fullName}
                </h2>

                <p className="text-sm text-gray-500 mt-1 break-all text-center">
                  {profile.email}
                </p>

                <span className="mt-3 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                  {profile.role === "admin" ? "Quản trị viên" : "Sinh viên"}
                </span>
              </div>

              <div className="mt-6 pt-5 border-t">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Chọn ảnh đại diện mới
                </label>

                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(event) =>
                    setAvatarFile(event.target.files?.[0] || null)
                  }
                  className="block w-full text-sm text-gray-500 file:mr-3 file:px-3 file:py-2 file:border-0 file:rounded-lg file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />

                <button
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={avatarLoading || !avatarFile}
                  className="w-full mt-3 px-4 py-2.5 bg-[#C92127] text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {avatarLoading ? "Đang tải ảnh..." : "Cập nhật ảnh đại diện"}
                </button>
              </div>
            </div>

            {/* ==================================================
                RIGHT
            ================================================== */}
            <div className="space-y-6">
              {/* ==================================================
                  THÔNG TIN CÁ NHÂN
              ================================================== */}
              <form
                onSubmit={handleUpdateProfile}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-5">
                  Thông tin cá nhân
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Họ và tên
                    </label>

                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleProfileChange}
                      className={inputClass}
                      placeholder="Nhập họ và tên"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>

                    <input
                      type="email"
                      value={profile.email || ""}
                      disabled
                      className={`${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Số điện thoại
                    </label>

                    <input
                      type="text"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleProfileChange}
                      className={inputClass}
                      placeholder="Nhập số điện thoại"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Trường đại học
                    </label>

                    <input
                      type="text"
                      name="university"
                      value={formData.university}
                      onChange={handleProfileChange}
                      className={inputClass}
                      placeholder="Nhập tên trường đại học"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="px-6 py-2.5 bg-[#C92127] text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                  >
                    {profileLoading ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>

              {/* ==================================================
                  ĐỊA CHỈ NHẬN HÀNG
              ================================================== */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Địa chỉ nhận hàng
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                      Lưu địa chỉ để đặt sách nhanh hơn.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openCreateAddressModal}
                    className="px-4 py-2.5 bg-[#C92127] text-white rounded-lg text-sm font-semibold hover:bg-red-700"
                  >
                    + Thêm địa chỉ
                  </button>
                </div>

                {addressLoading ? (
                  <div className="py-10 flex justify-center">
                    <div className="w-8 h-8 border-4 border-[#C92127] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 px-4 text-center">
                    <div className="text-4xl">📍</div>

                    <p className="mt-3 font-semibold text-gray-800">
                      Chưa có địa chỉ nhận hàng
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Thêm địa chỉ đầu tiên để sử dụng khi mua sách.
                    </p>

                    <button
                      type="button"
                      onClick={openCreateAddressModal}
                      className="mt-4 px-4 py-2 bg-[#C92127] text-white rounded-lg text-sm font-semibold hover:bg-red-700"
                    >
                      + Thêm địa chỉ
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addresses.map((address) => (
                      <div
                        key={address._id}
                        className={`rounded-xl border p-4 ${
                          address.isDefault
                            ? "border-[#C92127] bg-red-50/30"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-gray-900">
                                📍 {address.label || "Địa chỉ"}
                              </span>

                              {address.isDefault && (
                                <span className="px-2.5 py-1 rounded-full bg-red-100 text-[#C92127] text-xs font-semibold">
                                  Mặc định
                                </span>
                              )}
                            </div>

                            <p className="mt-3 font-semibold text-gray-800">
                              {address.receiverName}{" "}
                              <span className="font-normal text-gray-400">
                                |
                              </span>{" "}
                              <span className="font-normal text-gray-600">
                                {address.phoneNumber}
                              </span>
                            </p>

                            <p className="mt-2 text-sm leading-6 text-gray-600">
                              {formatAddress(address)}
                            </p>

                            {address.note && (
                              <p className="mt-1 text-sm text-gray-500">
                                Ghi chú: {address.note}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {!address.isDefault && (
                              <button
                                type="button"
                                disabled={Boolean(addressActionLoading)}
                                onClick={() =>
                                  handleSetDefaultAddress(address._id)
                                }
                                className="px-3 py-2 border border-green-200 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 disabled:opacity-50"
                              >
                                {addressActionLoading ===
                                `default-${address._id}`
                                  ? "Đang lưu..."
                                  : "Đặt mặc định"}
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={Boolean(addressActionLoading)}
                              onClick={() => openEditAddressModal(address)}
                              className="px-3 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 disabled:opacity-50"
                            >
                              Sửa
                            </button>

                            <button
                              type="button"
                              disabled={Boolean(addressActionLoading)}
                              onClick={() => handleDeleteAddress(address._id)}
                              className="px-3 py-2 border border-red-200 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 disabled:opacity-50"
                            >
                              {addressActionLoading === `delete-${address._id}`
                                ? "Đang xóa..."
                                : "Xóa"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ==================================================
                  ĐỔI MẬT KHẨU
              ================================================== */}
              <form
                onSubmit={handleChangePassword}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-5">
                  Đổi mật khẩu
                </h2>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mật khẩu hiện tại
                    </label>

                    <input
                      type="password"
                      name="oldPassword"
                      value={passwordData.oldPassword}
                      onChange={handlePasswordChange}
                      className={inputClass}
                      autoComplete="current-password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mật khẩu mới
                    </label>

                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className={inputClass}
                      autoComplete="new-password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Xác nhận mật khẩu mới
                    </label>

                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className={inputClass}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-black disabled:opacity-50"
                  >
                    {passwordLoading ? "Đang đổi..." : "Đổi mật khẩu"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          POPUP THÊM / SỬA ĐỊA CHỈ
      ================================================== */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#C92127]">
                  Địa chỉ nhận hàng
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  {editingAddress ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}
                </h2>
              </div>

              <button
                type="button"
                disabled={Boolean(addressActionLoading)}
                onClick={closeAddressModal}
                className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmitAddress} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* LABEL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tên địa chỉ
                  </label>

                  <input
                    type="text"
                    name="label"
                    value={addressForm.label}
                    onChange={handleAddressChange}
                    className={inputClass}
                    placeholder="Ví dụ: Nhà, Ký túc xá..."
                  />
                </div>

                {/* RECEIVER */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Họ tên người nhận <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    name="receiverName"
                    value={addressForm.receiverName}
                    onChange={handleAddressChange}
                    className={inputClass}
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                {/* PHONE */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    name="phoneNumber"
                    value={addressForm.phoneNumber}
                    onChange={handleAddressChange}
                    className={inputClass}
                    placeholder="09xxxxxxxx"
                  />
                </div>

                {/* ADDRESS LINE */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Số nhà / Đường / Khóm - Ấp{" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    name="addressLine"
                    value={addressForm.addressLine}
                    onChange={handleAddressChange}
                    className={inputClass}
                    placeholder="Ví dụ: 212B Nguyễn Trãi, Khóm 6"
                  />
                </div>

                {/* WARD */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phường / Xã <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    name="ward"
                    value={addressForm.ward}
                    onChange={handleAddressChange}
                    className={inputClass}
                    placeholder="Phường Trà Vinh"
                  />
                </div>

                {/* PROVINCE */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tỉnh / Thành phố <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    name="province"
                    value={addressForm.province}
                    onChange={handleAddressChange}
                    className={inputClass}
                    placeholder="Vĩnh Long"
                  />
                </div>

                {/* NOTE */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ghi chú
                  </label>

                  <textarea
                    name="note"
                    value={addressForm.note}
                    onChange={handleAddressChange}
                    rows={3}
                    className={`${inputClass} resize-none`}
                    placeholder="Ví dụ: Gọi trước khi giao..."
                  />
                </div>

                {/* DEFAULT */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isDefault"
                      checked={addressForm.isDefault}
                      onChange={handleAddressChange}
                      className="w-4 h-4 accent-[#C92127]"
                    />

                    <span className="text-sm font-medium text-gray-700">
                      Đặt làm địa chỉ mặc định
                    </span>
                  </label>
                </div>
              </div>

              {/* BUTTON */}
              <div className="mt-6 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={Boolean(addressActionLoading)}
                  onClick={closeAddressModal}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={Boolean(addressActionLoading)}
                  className="rounded-xl bg-[#C92127] px-6 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addressActionLoading
                    ? "Đang lưu..."
                    : editingAddress
                      ? "Lưu thay đổi"
                      : "Thêm địa chỉ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Profile;
