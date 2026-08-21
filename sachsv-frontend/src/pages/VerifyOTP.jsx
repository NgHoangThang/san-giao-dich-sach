// src/pages/VerifyOTP.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";

const VerifyOTP = () => {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  // Nếu người dùng truy cập trực tiếp URL mà không có email, đẩy về trang Đăng ký
  useEffect(() => {
    if (!email) {
      navigate("/register");
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      await api.post("/api/auth/verify-otp", { email, otp });
      setMessage("Xác thực thành công! Đang chuyển hướng đăng nhập...");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message || "Mã OTP không hợp lệ hoặc đã hết hạn.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setMessage("Đang gửi lại mã...");
    try {
      await api.post("/api/auth/send-otp", { email });
      setMessage("Đã gửi lại mã OTP. Vui lòng kiểm tra email.");
    } catch (err) {
      setError("Lỗi khi gửi lại mã. Vui lòng thử lại sau.");
      setMessage("");
    }
  };

  if (!email) return null; // Tránh render nhấp nháy trước khi useEffect redirect

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-[#1E3A5F]">
          Xác thực Email
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Mã OTP đã được gửi tới email: <br />{" "}
          <span className="font-semibold text-gray-800">{email}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            {message && !error && (
              <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm text-center">
                {message}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 text-center">
                Nhập mã OTP (6 số)
              </label>
              <div className="mt-2">
                <input
                  name="otp"
                  type="text"
                  maxLength="6"
                  required
                  className="appearance-none block w-full text-center tracking-widest text-2xl px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#1E3A5F] focus:border-[#1E3A5F]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} // Chỉ cho phép nhập số
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || otp.length < 6}
                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${isLoading || otp.length < 6 ? "bg-gray-400 cursor-not-allowed" : "bg-[#F59E0B] hover:bg-amber-600"} focus:outline-none transition-colors`}
              >
                {isLoading ? "Đang kiểm tra..." : "Xác thực tài khoản"}
              </button>
            </div>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={handleResendOTP}
                className="text-sm font-medium text-[#1E3A5F] hover:underline"
              >
                Chưa nhận được mã? Gửi lại
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
