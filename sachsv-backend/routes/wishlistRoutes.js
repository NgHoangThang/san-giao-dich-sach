const express = require("express");
const router = express.Router();
const wishlistController = require("../controllers/wishlistController");
const authMiddleware = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");

router.post("/", authMiddleware, wishlistController.addToWishlist);
router.get("/", authMiddleware, wishlistController.getWishlist);
router.delete(
  "/:bookId",
  authMiddleware,
  validateObjectId("bookId"),
  wishlistController.removeFromWishlist,
);

module.exports = router;
