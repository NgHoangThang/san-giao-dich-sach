const express = require("express");
const router = express.Router();

const bookController = require("../controllers/bookController");
const authMiddleware = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin"); // Import bảo vệ Admin
const {
  validateBook,
  validateBookUpdate,
} = require("../middleware/validateBook");
const upload = require("../middleware/upload");
const validateObjectId = require("../middleware/validateObjectId");

// ==========================================
// ROUTE CẦN ĐĂNG NHẬP (Yêu cầu có Token)
// ==========================================

// Đăng sách mới (Chỉ Admin)
router.post(
  "/create",
  authMiddleware,
  isAdmin, // Chỉ Admin được đăng
  upload.array("images", 10),
  validateBook,
  bookController.createBook,
);

// Lấy danh sách sách do chính user đăng (Giữ nguyên để Admin quản lý kho)
router.get("/my-books", authMiddleware, isAdmin, bookController.getMyBooks);

// Sửa sách theo ID (Chỉ Admin)
router.put(
  "/:id",
  authMiddleware,
  isAdmin, // Chỉ Admin được sửa
  validateObjectId("id"),
  upload.array("images", 10), // ĐÃ THÊM: nhận ảnh mới khi sửa sách
  validateBookUpdate,
  bookController.updateBook,
);

// Xóa sách theo ID (Chỉ Admin)
router.delete(
  "/:id",
  authMiddleware,
  isAdmin,
  validateObjectId("id"),
  bookController.deleteBook,
); // Chỉ Admin được xóa

// Đánh dấu sách đã bán (Chỉ Admin)
router.patch(
  "/:id/sold",
  authMiddleware,
  isAdmin,
  validateObjectId("id"),
  bookController.markAsSold,
);

// Ẩn sách (Chỉ Admin)
router.patch(
  "/:id/hide",
  authMiddleware,
  isAdmin,
  validateObjectId("id"),
  bookController.hideBook,
);

// Hiện sách lại (Chỉ Admin)
router.patch(
  "/:id/show",
  authMiddleware,
  isAdmin,
  validateObjectId("id"),
  bookController.showBook,
);

// ==========================================
// ROUTE CÔNG KHAI (Không cần Token)
// ==========================================

// Xem tất cả sách
router.get("/", bookController.getAllBooks);

// Xem sách của một người bán cụ thể
router.get(
  "/seller/:sellerId",
  validateObjectId("sellerId"),
  bookController.getBooksBySeller,
);

// Xem chi tiết 1 sách theo ID
router.get("/:id", validateObjectId("id"), bookController.getBookById);

module.exports = router;
