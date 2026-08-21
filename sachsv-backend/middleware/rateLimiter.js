const rateLimit = require("express-rate-limit");

// ======================================================
// GIỚI HẠN GỬI OTP (đã có sẵn từ trước)
// ======================================================
exports.otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 phút
  max: 3, // tối đa 3 lần
  message: {
    message: "Bạn đã gửi OTP quá nhiều lần, vui lòng thử lại sau 10 phút!",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ======================================================
// GIỚI HẠN ĐĂNG NHẬP — chống dò mật khẩu
// ------------------------------------------------------
// Trước đây /login không có giới hạn nào, kẻ tấn công có thể
// bắn hàng nghìn mật khẩu mỗi phút.
// ======================================================
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,
  message: {
    message:
      "Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Đăng nhập đúng thì không tính vào hạn mức
  skipSuccessfulRequests: true,
});

// ======================================================
// GIỚI HẠN NHẬP OTP — chống dò mã 6 số
// ------------------------------------------------------
// ĐÂY LÀ LỖ NGHIÊM TRỌNG NHẤT ĐÃ VÁ: OTP chỉ có 1.000.000
// khả năng, sống 5 phút. Không giới hạn = viết script bắn
// song song là chiếm được tài khoản bất kỳ.
// ======================================================
exports.otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 phút
  max: 5, // 5 lần đoán là khóa
  message: {
    message: "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// ======================================================
// GIỚI HẠN ĐĂNG KÝ — chống tạo tài khoản rác hàng loạt
// ======================================================
exports.registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 5,
  message: {
    message: "Bạn đã tạo quá nhiều tài khoản. Vui lòng thử lại sau 1 giờ.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
