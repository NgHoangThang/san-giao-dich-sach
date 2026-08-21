const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.get("/profile", authMiddleware, userController.getProfile);
router.put("/profile", authMiddleware, userController.updateProfile);
router.post(
  "/profile/avatar",
  authMiddleware,
  upload.single("avatar"),
  userController.uploadAvatar,
);
router.put("/change-password", authMiddleware, userController.changePassword);
router.get("/:id", userController.getUserById);

module.exports = router;
