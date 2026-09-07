const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");

const authMiddleware = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");

const { validateOrder } = require("../middleware/validateTransaction");
const validateObjectId = require("../middleware/validateObjectId");

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
  validateObjectId("id"),
  orderController.acceptOrder,
);

// ======================================================
// 2.5. ADMIN XÁC NHẬN ĐÃ NHẬN THANH TOÁN QR
// confirmed, chưa paid -> paid
// PATCH /api/orders/:id/confirm-payment
// ======================================================
router.patch(
  "/:id/confirm-payment",
  authMiddleware,
  isAdmin,
  validateObjectId("id"),
  orderController.confirmPayment,
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
  validateObjectId("id"),
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
router.patch(
  "/:id/ship",
  authMiddleware,
  isAdmin,
  validateObjectId("id"),
  orderController.shipOrder,
);

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
  validateObjectId("id"),
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
  validateObjectId("id"),
  orderController.deliverOrder,
);

// ======================================================
// 7. USER XÁC NHẬN ĐÃ NHẬN HÀNG
// delivered -> completed
// PATCH /api/orders/:id/complete
// ======================================================
router.patch(
  "/:id/complete",
  authMiddleware,
  validateObjectId("id"),
  orderController.completeOrder,
);

// ======================================================
// 8. USER HỦY / ADMIN TỪ CHỐI ĐƠN
// Chỉ khi đơn đang pending
// PATCH /api/orders/:id/cancel
// ======================================================
router.patch(
  "/:id/cancel",
  authMiddleware,
  validateObjectId("id"),
  orderController.cancelOrder,
);

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
router.get(
  "/:id/tracking",
  authMiddleware,
  validateObjectId("id"),
  orderController.getOrderTracking,
);

module.exports = router;
