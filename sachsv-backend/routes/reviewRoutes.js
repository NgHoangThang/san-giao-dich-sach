const express = require("express");

const router = express.Router();

const reviewController = require("../controllers/reviewController");

const authMiddleware = require("../middleware/authMiddleware");

const { validateReview } = require("../middleware/validateTransaction");
const validateObjectId = require("../middleware/validateObjectId");

// Tạo đánh giá sau khi giao dịch hoàn thành
router.post(
  "/create",
  authMiddleware,
  validateReview,
  reviewController.createReview,
);

// Xem đánh giá của một người bán
router.get(
  "/seller/:sellerId",
  validateObjectId("sellerId"),
  reviewController.getSellerReviews,
);

module.exports = router;
