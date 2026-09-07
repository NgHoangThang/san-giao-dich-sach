const express = require("express");

const router = express.Router();

const addressController = require("../controllers/addressController");

const authMiddleware = require("../middleware/authMiddleware");
const isUser = require("../middleware/isUser");
const validateObjectId = require("../middleware/validateObjectId");

// ======================================================
// LẤY TẤT CẢ ĐỊA CHỈ CỦA USER
// GET /api/addresses
// CHỈ USER ĐƯỢC PHÉP
// ======================================================
router.get("/", authMiddleware, isUser, addressController.getMyAddresses);

// ======================================================
// THÊM ĐỊA CHỈ
// POST /api/addresses
// CHỈ USER ĐƯỢC PHÉP
// ======================================================
router.post("/", authMiddleware, isUser, addressController.createAddress);

// ======================================================
// ĐẶT ĐỊA CHỈ MẶC ĐỊNH
// PATCH /api/addresses/:id/default
// CHỈ USER ĐƯỢC PHÉP
// ======================================================
router.patch(
  "/:id/default",
  authMiddleware,
  isUser,
  validateObjectId("id"),
  addressController.setDefaultAddress,
);

// ======================================================
// SỬA ĐỊA CHỈ
// PATCH /api/addresses/:id
// CHỈ USER ĐƯỢC PHÉP
// ======================================================
router.patch(
  "/:id",
  authMiddleware,
  isUser,
  validateObjectId("id"),
  addressController.updateAddress,
);

// ======================================================
// XÓA ĐỊA CHỈ
// DELETE /api/addresses/:id
// CHỈ USER ĐƯỢC PHÉP
// ======================================================
router.delete(
  "/:id",
  authMiddleware,
  isUser,
  validateObjectId("id"),
  addressController.deleteAddress,
);

module.exports = router;
