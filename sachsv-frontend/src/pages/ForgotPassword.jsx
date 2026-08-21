import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: nhập email, 2: nhập OTP + mật khẩu mới
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Bước 1: Gửi OTP về email
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/forgot-password", { email });
      setMessage("Đã gửi mã OTP về email của bạn!");
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message || "Email không tồn tại trong hệ thống",
      );
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Đặt lại mật khẩu
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      return setError("Mật khẩu xác nhận không khớp!");
    }
    if (newPassword.length < 6) {
      return setError("Mật khẩu phải có ít nhất 6 ký tự!");
    }

    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", {
        email,
        otp,
        newPassword,
      });
      setMessage("Đặt lại mật khẩu thành công!");
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "OTP không đúng hoặc đã hết hạn");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#1E3A5F] rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl">📚</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Quên mật khẩu</h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 1 && "Nhập email để nhận mã OTP"}
            {step === 2 && "Nhập mã OTP và mật khẩu mới"}
            {step === 3 && "Mật khẩu đã được đặt lại"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step >= s
                    ? "bg-[#1E3A5F] text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-8 h-0.5 ${step > s ? "bg-[#1E3A5F]" : "bg-gray-200"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Thông báo thành công */}
        {message && (
          <div className="bg-green-50 text-green-700 border border-green-200 rounded-xl px-4 py-3 text-sm mb-4 text-center">
            {message}
          </div>
        )}

        {/* Thông báo lỗi */}
        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-3 text-sm mb-4 text-center">
            {error}
          </div>
        )}

        {/* BƯỚC 1 — Nhập email */}
        {step === 1 && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email đã đăng ký
              </label>
              <input
                type="email"
                required
                placeholder="example@gmail.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? "Đang gửi..." : "Gửi mã OTP"}
            </button>
          </form>
        )}

        {/* BƯỚC 2 — Nhập OTP + mật khẩu mới */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="Nhập 6 chữ số"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none transition-all text-center text-2xl font-bold tracking-widest"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              />
              <p className="text-xs text-gray-400 mt-1 text-center">
                Kiểm tra hộp thư của {email}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu mới
              </label>
              <input
                type="password"
                required
                placeholder="Tối thiểu 6 ký tự"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none transition-all"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                required
                placeholder="Nhập lại mật khẩu mới"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1E3A5F] focus:border-[#1E3A5F] outline-none transition-all"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError("");
                setMessage("");
              }}
              className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Dùng email khác
            </button>
          </form>
        )}

        {/* BƯỚC 3 — Thành công */}
        {step === 3 && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">✅</span>
            </div>
            <p className="text-gray-600">
              Mật khẩu đã được đặt lại thành công!
            </p>
            <Link
              to="/login"
              className="block w-full py-3 bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-semibold rounded-xl transition-colors text-center"
            >
              Đăng nhập ngay
            </Link>
          </div>
        )}

        {/* Link về đăng nhập */}
        {step !== 3 && (
          <p className="text-center text-sm text-gray-500 mt-6">
            Nhớ mật khẩu rồi?{" "}
            <Link
              to="/login"
              className="text-[#1E3A5F] font-semibold hover:underline"
            >
              Đăng nhập
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
