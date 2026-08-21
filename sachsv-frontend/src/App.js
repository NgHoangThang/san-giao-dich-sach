import React from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Navbar from "./components/Navbar";

// ======================================================
// PUBLIC PAGES
// ======================================================
import Home from "./pages/Home";
import AllBooks from "./pages/AllBooks";
import BestPriceBooks from "./pages/BestPriceBooks";
import NewBooks from "./pages/NewBooks";
import TextbookBooks from "./pages/TextbookBooks";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyOTP from "./pages/VerifyOTP";
import ForgotPassword from "./pages/ForgotPassword";

import BookDetail from "./pages/BookDetail";
import CreateBook from "./pages/CreateBook";
import MyBooks from "./pages/MyBooks";
import Orders from "./pages/Orders";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Wishlist from "./pages/Wishlist";
import SellerProfile from "./pages/SellerProfile";

// ======================================================
// SHOP PUBLIC
// ======================================================
import Shop from "./pages/Shop";

// ======================================================
// ADMIN PAGES
// ======================================================
import Dashboard from "./pages/admin/Dashboard";
import AdminBooks from "./pages/admin/AdminBooks";
import ManageUsers from "./pages/admin/ManageUsers";
import ManageReports from "./pages/admin/ManageReports";
import ManageReviews from "./pages/admin/ManageReviews";
import AdminShop from "./pages/admin/AdminShop";

import { AuthProvider, useAuth } from "./context/AuthContext";

// ======================================================
// ROUTE YÊU CẦU ĐĂNG NHẬP
// USER + ADMIN ĐỀU CÓ THỂ VÀO
// ======================================================
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// ======================================================
// ROUTE CHỈ DÀNH CHO ADMIN
// ======================================================
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  // Chưa đăng nhập
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Đã đăng nhập nhưng không phải Admin
  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#F8F7F4] flex flex-col">
          <Navbar />

          <main className="flex-grow">
            <Routes>
              {/* ==================================================
                  ROUTE CÔNG KHAI
                  AI CŨNG CÓ THỂ XEM
              ================================================== */}

              {/* Trang chủ */}
              <Route path="/" element={<Home />} />

              {/* Tất cả sách */}
              <Route path="/tat-ca-sach" element={<AllBooks />} />

              {/* Sách giá tốt */}
              <Route path="/sach-gia-tot" element={<BestPriceBooks />} />

              {/* Giáo trình nổi bật */}
              <Route path="/giao-trinh-noi-bat" element={<TextbookBooks />} />

              {/* Chi tiết sách */}
              <Route path="/books/:id" element={<BookDetail />} />

              {/* Trang thông tin người bán */}
              <Route path="/seller/:id" element={<SellerProfile />} />

              {/* ==================================================
                  SHOP PUBLIC
                  KHÔNG CẦN ĐĂNG NHẬP
              ================================================== */}
              <Route path="/shop" element={<Shop />} />

              {/* Đăng nhập */}
              <Route path="/login" element={<Login />} />

              {/* Đăng ký */}
              <Route path="/register" element={<Register />} />

              {/* Xác thực OTP */}
              <Route path="/verify-otp" element={<VerifyOTP />} />

              {/* Quên mật khẩu */}
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* ==================================================
                  ROUTE USER + ADMIN
                  PHẢI ĐĂNG NHẬP
              ================================================== */}

              {/* Đơn hàng */}
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <Orders />
                  </ProtectedRoute>
                }
              />

              {/* Hồ sơ cá nhân */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Yêu thích */}
              <Route
                path="/wishlist"
                element={
                  <ProtectedRoute>
                    <Wishlist />
                  </ProtectedRoute>
                }
              />

              {/* Tin nhắn */}
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />

              {/* Chi tiết cuộc trò chuyện */}
              <Route
                path="/chat/:conversationId"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />

              {/* ==================================================
                  ROUTE CHỈ ADMIN
                  USER KHÔNG ĐƯỢC TRUY CẬP
              ================================================== */}

              {/* Sách mới - công khai, ai cũng xem được */}
              <Route path="/sach-moi-dang" element={<NewBooks />} />

              {/* Admin đăng sách */}
              <Route
                path="/create-book"
                element={
                  <AdminRoute>
                    <CreateBook />
                  </AdminRoute>
                }
              />

              {/* Admin quản lý sách đã đăng */}
              <Route
                path="/my-books"
                element={
                  <AdminRoute>
                    <MyBooks />
                  </AdminRoute>
                }
              />

              {/* Dashboard */}
              <Route
                path="/admin/dashboard"
                element={
                  <AdminRoute>
                    <Dashboard />
                  </AdminRoute>
                }
              />

              {/* Quản lý sách */}
              <Route
                path="/admin/books"
                element={
                  <AdminRoute>
                    <AdminBooks />
                  </AdminRoute>
                }
              />

              {/* ==================================================
                  ADMIN QUẢN LÝ SHOP
              ================================================== */}
              <Route
                path="/admin/shop"
                element={
                  <AdminRoute>
                    <AdminShop />
                  </AdminRoute>
                }
              />

              {/* Quản lý người dùng */}
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <ManageUsers />
                  </AdminRoute>
                }
              />

              {/* Quản lý tố cáo */}
              <Route
                path="/admin/reports"
                element={
                  <AdminRoute>
                    <ManageReports />
                  </AdminRoute>
                }
              />

              {/* Quản lý đánh giá */}
              <Route
                path="/admin/reviews"
                element={
                  <AdminRoute>
                    <ManageReviews />
                  </AdminRoute>
                }
              />

              {/* ==================================================
                  ROUTE KHÔNG TỒN TẠI
              ================================================== */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
