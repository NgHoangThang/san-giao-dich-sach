const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// Kiểm tra đăng nhập và quyền Admin cho toàn bộ route
router.use(authMiddleware, authorizeRoles("admin"));

// ======================================================
// DASHBOARD
// ======================================================

// Lấy thống kê Dashboard
router.get("/dashboard", adminController.getDashboardStats);

// ======================================================
// QUẢN LÝ NGƯỜI DÙNG
// ======================================================

// Lấy danh sách người dùng
router.get("/users", adminController.getAllUsers);

// Khóa tài khoản
router.patch("/users/:id/lock", adminController.lockUser);

// Mở khóa tài khoản
router.patch("/users/:id/unlock", adminController.unlockUser);

// ======================================================
// QUẢN LÝ SÁCH
// ======================================================

// Xem toàn bộ sách
router.get("/books", adminController.getAllBooksForAdmin);

// Xóa sách vi phạm
router.delete("/books/:id", adminController.deleteBookAdmin);

// ======================================================
// QUẢN LÝ TỐ CÁO
// ======================================================

// Lấy danh sách tố cáo
router.get("/reports", adminController.getAllReports);

// Cập nhật trạng thái tố cáo
router.patch("/reports/:id/status", adminController.updateReportStatus);

// Xóa vĩnh viễn tố cáo
router.delete("/reports/:id", adminController.deleteReport);

// ======================================================
// QUẢN LÝ ĐÁNH GIÁ
// ======================================================

// Admin xem toàn bộ đánh giá
router.get("/reviews", adminController.getAllReviews);

// Chỉ để một dòng này ở cuối file
module.exports = router;
