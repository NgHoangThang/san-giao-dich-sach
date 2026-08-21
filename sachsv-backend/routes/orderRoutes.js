const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");

const authMiddleware = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");

const { validateOrder } = require("../middleware/validateTransaction");

// ======================================================
// 1. USER TẠO ĐƠN MUA SÁCH
// POST /api/orders/create
// ======================================================
router.post(
  "/create",
  authMiddleware,
  validateOrder,
  orderController.createOrder,
);

// ======================================================
// 2. ADMIN XÁC NHẬN ĐƠN
// pending -> confirmed
// PATCH /api/orders/:id/accept
// ======================================================
router.patch(
  "/:id/accept",
  authMiddleware,
  isAdmin,
  orderController.acceptOrder,
);

// ======================================================
// 3. ADMIN BẮT ĐẦU CHUẨN BỊ HÀNG
// confirmed -> preparing
// PATCH /api/orders/:id/prepare
// ======================================================
router.patch(
  "/:id/prepare",
  authMiddleware,
  isAdmin,
  orderController.prepareOrder,
);

// ======================================================
// 4. ADMIN BẮT ĐẦU GIAO HÀNG
// preparing -> shipping
//
// Body:
// {
//   shippingProvider,
//   trackingCode,
//   estimatedDeliveryDate,
//   shippingNote
// }
// ======================================================
router.patch("/:id/ship", authMiddleware, isAdmin, orderController.shipOrder);

// ======================================================
// 5. ADMIN CẬP NHẬT THÔNG TIN / VỊ TRÍ GIAO HÀNG
// shipping -> shipping
//
// Body có thể gồm:
// {
//   shippingProvider,
//   trackingCode,
//   estimatedDeliveryDate,
//   shippingNote
// }
// ======================================================
router.patch(
  "/:id/shipping-update",
  authMiddleware,
  isAdmin,
  orderController.updateShipping,
);

// ======================================================
// 6. ADMIN XÁC NHẬN ĐÃ GIAO
// shipping -> delivered
// PATCH /api/orders/:id/deliver
// ======================================================
router.patch(
  "/:id/deliver",
  authMiddleware,
  isAdmin,
  orderController.deliverOrder,
);

// ======================================================
// 7. USER XÁC NHẬN ĐÃ NHẬN HÀNG
// delivered -> completed
// PATCH /api/orders/:id/complete
// ======================================================
router.patch("/:id/complete", authMiddleware, orderController.completeOrder);

// ======================================================
// 8. USER HỦY / ADMIN TỪ CHỐI ĐƠN
// Chỉ khi đơn đang pending
// PATCH /api/orders/:id/cancel
// ======================================================
router.patch("/:id/cancel", authMiddleware, orderController.cancelOrder);

// ======================================================
// 9. LỊCH SỬ ĐƠN USER ĐÃ MUA
// GET /api/orders/history/buy
// ======================================================
router.get("/history/buy", authMiddleware, orderController.getBuyHistory);

// ======================================================
// 10. DANH SÁCH ĐƠN ADMIN ĐANG BÁN
// GET /api/orders/history/sell
// ======================================================
router.get(
  "/history/sell",
  authMiddleware,
  isAdmin,
  orderController.getSellOrders,
);
// ======================================================
// 11. LẤY TIMELINE VẬN CHUYỂN CỦA ĐƠN HÀNG
// GET /api/orders/:id/tracking
// ======================================================
router.get("/:id/tracking", authMiddleware, orderController.getOrderTracking);

module.exports = router;
