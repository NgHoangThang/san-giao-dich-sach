const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { validateRegister } = require("../middleware/validateAuth");

const {
  otpLimiter,
  otpVerifyLimiter,
  loginLimiter,
  registerLimiter,
} = require("../middleware/rateLimiter");

// ======================================================
// ĐÃ SỬA:
//   - validateRegister đã viết sẵn nhưng chưa từng được gắn
//     vào route nào -> đăng ký mật khẩu "1" vẫn lọt. Gắn lại.
//   - /login, /verify-otp, /reset-password trước đây không có
//     giới hạn tần suất -> dò mật khẩu và dò OTP thoải mái.
// ======================================================

router.post(
  "/register",
  registerLimiter,
  validateRegister,
  authController.register,
);

router.post("/login", loginLimiter, authController.login);

router.post("/google", loginLimiter, authController.googleLogin);

router.post("/send-otp", otpLimiter, authController.sendOTP);

router.post("/verify-otp", otpVerifyLimiter, authController.verifyOTP);

router.post("/forgot-password", otpLimiter, authController.forgotPassword);

router.post("/reset-password", otpVerifyLimiter, authController.resetPassword);

module.exports = router;
