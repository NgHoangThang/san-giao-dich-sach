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
  upload.array("images", 10), // ĐÃ THÊM: nhận ảnh mới khi sửa sách
  validateBookUpdate,
  bookController.updateBook,
);

// Xóa sách theo ID (Chỉ Admin)
router.delete("/:id", authMiddleware, isAdmin, bookController.deleteBook); // Chỉ Admin được xóa

// Đánh dấu sách đã bán (Chỉ Admin)
router.patch("/:id/sold", authMiddleware, isAdmin, bookController.markAsSold);

// Ẩn sách (Chỉ Admin)
router.patch("/:id/hide", authMiddleware, isAdmin, bookController.hideBook);

// Hiện sách lại (Chỉ Admin)
router.patch("/:id/show", authMiddleware, isAdmin, bookController.showBook);

// ==========================================
// ROUTE CÔNG KHAI (Không cần Token)
// ==========================================

// Xem tất cả sách
router.get("/", bookController.getAllBooks);

// Xem sách của một người bán cụ thể
router.get("/seller/:sellerId", bookController.getBooksBySeller);

// Xem chi tiết 1 sách theo ID
router.get("/:id", bookController.getBookById);

module.exports = router;
