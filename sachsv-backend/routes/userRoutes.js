const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const {
  validateUpdateProfile,
  validateChangePassword,
} = require("../middleware/validateAuth");
const validateObjectId = require("../middleware/validateObjectId");

router.get("/profile", authMiddleware, userController.getProfile);
router.put(
  "/profile",
  authMiddleware,
  validateUpdateProfile,
  userController.updateProfile,
);
router.post(
  "/profile/avatar",
  authMiddleware,
  upload.single("avatar"),
  userController.uploadAvatar,
);
router.put(
  "/change-password",
  authMiddleware,
  validateChangePassword,
  userController.changePassword,
);
router.get("/:id", validateObjectId("id"), userController.getUserById);

module.exports = router;
