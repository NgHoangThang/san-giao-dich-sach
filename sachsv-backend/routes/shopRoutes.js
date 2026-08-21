const express = require("express");

const router = express.Router();

const shopController = require("../controllers/shopController");

const authMiddleware = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");

// ======================================================
// PUBLIC
// Ai cũng xem thông tin shop được
// GET /api/shop
// ======================================================
router.get("/", shopController.getPublicShop);

// ======================================================
// ADMIN
// Lấy thông tin shop để chỉnh sửa
// GET /api/shop/admin
// ======================================================
router.get("/admin", authMiddleware, isAdmin, shopController.getAdminShop);

// ======================================================
// ADMIN
// Tạo / cập nhật shop
// PUT /api/shop/admin
// ======================================================
router.put("/admin", authMiddleware, isAdmin, shopController.saveShop);

module.exports = router;
