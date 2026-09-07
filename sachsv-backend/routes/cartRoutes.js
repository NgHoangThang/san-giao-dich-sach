const express = require("express");

const router = express.Router();

const cartController = require("../controllers/cartController");

const authMiddleware = require("../middleware/authMiddleware");
const isUser = require("../middleware/isUser");
const validateObjectId = require("../middleware/validateObjectId");
const {
  validateAddToCart,
  validateUpdateCartItem,
} = require("../middleware/validateCart");

// ======================================================
// GIỎ HÀNG — CHỈ NGƯỜI MUA (student/user) ĐƯỢC PHÉP
// Admin không mua sách của chính shop mình.
// ======================================================

// Xem giỏ hàng
router.get("/", authMiddleware, isUser, cartController.getCart);

// Thêm sách vào giỏ
router.post(
  "/",
  authMiddleware,
  isUser,
  validateAddToCart,
  cartController.addToCart,
);

// Sửa số lượng 1 sách trong giỏ
router.patch(
  "/:bookId",
  authMiddleware,
  isUser,
  validateObjectId("bookId"),
  validateUpdateCartItem,
  cartController.updateCartItem,
);

// Xóa 1 sách khỏi giỏ
router.delete(
  "/:bookId",
  authMiddleware,
  isUser,
  validateObjectId("bookId"),
  cartController.removeCartItem,
);

// Xóa sạch giỏ hàng
router.delete("/", authMiddleware, isUser, cartController.clearCart);

module.exports = router;
