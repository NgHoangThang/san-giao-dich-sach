import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ======================================================
  // LẤY LẠI THÔNG TIN NGƯỜI DÙNG
  // ======================================================
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      return null;
    }

    try {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      const response = await api.get("/api/users/profile");

      const userData = response.data.user || response.data;

      setUser(userData);

      return userData;
    } catch (error) {
      console.error("Không thể lấy thông tin người dùng:", error);

      localStorage.removeItem("token");
      delete api.defaults.headers.common.Authorization;
      setUser(null);

      return null;
    }
  }, []);

  // ======================================================
  // KIỂM TRA PHIÊN ĐĂNG NHẬP KHI MỞ WEBSITE
  // ======================================================
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);

      await refreshUser();

      setLoading(false);
    };

    initializeAuth();
  }, [refreshUser]);

  // ======================================================
  // ĐĂNG NHẬP
  // ======================================================
  const login = (userData, token) => {
    localStorage.setItem("token", token);

    api.defaults.headers.common.Authorization = `Bearer ${token}`;

    setUser(userData);
  };

  // ======================================================
  // ĐĂNG XUẤT
  // ======================================================
  const logout = () => {
    localStorage.removeItem("token");

    delete api.defaults.headers.common.Authorization;

    setUser(null);
  };

  // ======================================================
  // CẬP NHẬT USER TRONG CONTEXT
  // Dùng sau khi sửa tên hoặc avatar
  // ======================================================
  const updateUser = (newUserData) => {
    setUser((previousUser) => ({
      ...previousUser,
      ...newUserData,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
