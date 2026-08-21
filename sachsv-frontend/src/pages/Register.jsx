// src/pages/Register.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    university: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Gọi API đăng ký
      await api.post("/api/auth/register", formData);

      // Tự động gọi API gửi mã OTP sau khi đăng ký thành công
      await api.post("/api/auth/send-otp", { email: formData.email });

      // Chuyển hướng sang trang nhập OTP, truyền theo email
      navigate("/verify-otp", { state: { email: formData.email } });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-[#1E3A5F]">
          Tạo tài khoản mới
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="font-medium text-[#F59E0B] hover:text-amber-500"
          >
            Đăng nhập ngay
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Họ và tên
              </label>
              <div className="mt-1">
                <input
                  name="fullName"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#1E3A5F] focus:border-[#1E3A5F] sm:text-sm"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Trường Đại học
              </label>
              <div className="mt-1">
                <input
                  name="university"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#1E3A5F] focus:border-[#1E3A5F] sm:text-sm"
                  placeholder="VD: ĐH Kinh Tế Quốc Dân"
                  value={formData.university}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email sinh viên
              </label>
              <div className="mt-1">
                <input
                  name="email"
                  type="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#1E3A5F] focus:border-[#1E3A5F] sm:text-sm"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <div className="mt-1">
                <input
                  name="password"
                  type="password"
                  required
                  minLength="6"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#1E3A5F] focus:border-[#1E3A5F] sm:text-sm"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-[#1E3A5F] hover:bg-blue-900"} focus:outline-none transition-colors`}
              >
                {isLoading ? "Đang tạo tài khoản..." : "Đăng ký tài khoản"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
