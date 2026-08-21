const express = require("express");
const router = express.Router();
const wishlistController = require("../controllers/wishlistController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, wishlistController.addToWishlist);
router.get("/", authMiddleware, wishlistController.getWishlist);
router.delete(
  "/:bookId",
  authMiddleware,
  wishlistController.removeFromWishlist,
);

module.exports = router;
