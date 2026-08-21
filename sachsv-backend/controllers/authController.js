const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { sendOTPEmail } = require("../config/email");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ======================================================
// TIỆN ÍCH DÙNG CHUNG
// ======================================================

// Sinh OTP 6 số bằng crypto thay vì Math.random().
// Math.random() đoán được nếu biết trạng thái bộ sinh số,
// còn crypto.randomInt dùng nguồn ngẫu nhiên của hệ điều hành.
const generateOTP = () => String(crypto.randomInt(100000, 1000000));

// So sánh OTP theo kiểu thời gian cố định, tránh lộ thông tin
// qua việc đo thời gian phản hồi
const isOTPMatch = (stored, provided) => {
  if (!stored || !provided) return false;

  const a = Buffer.from(String(stored));
  const b = Buffer.from(String(provided));

  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
};

const signToken = (user) =>
  jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "2d",
  });

// ======================================================
// 1. ĐĂNG KÝ TÀI KHOẢN
// ======================================================
exports.register = async (req, res) => {
  try {
    const { email, password, fullName, university, phoneNumber } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email này đã được sử dụng!" });
    }

    const newUser = new User({
      email,
      password,
      fullName,
      university,
      phoneNumber,
    });

    await newUser.save();

    res.status(201).json({
      message: "Đăng ký thành công! Vui lòng xác thực email để đăng nhập.",
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// ======================================================
// 2. ĐĂNG NHẬP
// ======================================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không đúng!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không đúng!" });
    }

    // ==========================================
    // CHẶN NGƯỜI DÙNG BỊ KHÓA
    // ==========================================
    if (user.isLocked) {
      return res.status(403).json({
        message:
          "Tài khoản của bạn đã bị khóa do vi phạm chính sách. Vui lòng liên hệ Ban Quản Trị.",
      });
    }

    // ==========================================
    // ĐÃ SỬA: BẮT BUỘC XÁC THỰC EMAIL
    // ------------------------------------------
    // Trước đây login không kiểm isVerified, nên toàn bộ luồng
    // gửi OTP / xác thực email chỉ là trang trí — đăng ký xong
    // bỏ qua OTP vẫn vào được bình thường.
    // ==========================================
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Tài khoản chưa xác thực email. Vui lòng nhập mã OTP.",
        needVerify: true,
        email: user.email,
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "Server chưa cấu hình JWT_SECRET. Kiểm tra file .env",
      });
    }

    const token = signToken(user);

    res.status(200).json({
      message: "Đăng nhập thành công!",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// ======================================================
// 2b. ĐĂNG NHẬP BẰNG GOOGLE
// ======================================================
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Thiếu thông tin xác thực Google",
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        message: "Server chưa cấu hình GOOGLE_CLIENT_ID. Kiểm tra file .env",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, email_verified: emailVerified } = payload;

    if (!emailVerified) {
      return res.status(400).json({
        message: "Email Google của bạn chưa được xác thực",
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString("hex");

      user = new User({
        email,
        password: randomPassword,
        fullName: name || email.split("@")[0],
        avatar: picture || "",
        isVerified: true, // Google đã xác thực email hộ rồi
      });

      await user.save();
    }

    if (user.isLocked) {
      return res.status(403).json({
        message:
          "Tài khoản của bạn đã bị khóa do vi phạm chính sách. Vui lòng liên hệ Ban Quản Trị.",
      });
    }

    // Tài khoản đăng ký thường rồi mới đăng nhập Google:
    // Google đã xác nhận email này thuộc về họ nên đánh dấu luôn
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "Server chưa cấu hình JWT_SECRET. Kiểm tra file .env",
      });
    }

    const token = signToken(user);

    res.status(200).json({
      message: "Đăng nhập bằng Google thành công!",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Lỗi googleLogin:", error.message);

    res.status(401).json({
      message: "Xác thực Google thất bại, vui lòng thử lại",
    });
  }
};

// ======================================================
// 3. GỬI OTP XÁC THỰC EMAIL
// ======================================================
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // ĐÃ SỬA: không tiết lộ email nào có tài khoản.
    // Trước đây trả 404 "Email không tồn tại" -> dò được
    // danh sách người dùng của hệ thống.
    const genericResponse = {
      message: "Nếu email tồn tại, mã OTP đã được gửi.",
    };

    if (!user || user.isVerified) {
      return res.status(200).json(genericResponse);
    }

    const otp = generateOTP();

    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    await user.save();

    await sendOTPEmail(email, otp);

    res.status(200).json(genericResponse);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// ======================================================
// 4. XÁC THỰC OTP
// ======================================================
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    // Gộp chung một thông báo cho mọi trường hợp sai, để không
    // phân biệt được "email không tồn tại" với "OTP sai"
    const invalid = { message: "Mã OTP không đúng hoặc đã hết hạn." };

    if (!user || !user.otp || !user.otpExpires) {
      return res.status(400).json(invalid);
    }

    if (user.otpExpires < new Date()) {
      return res.status(400).json(invalid);
    }

    if (!isOTPMatch(user.otp, otp)) {
      return res.status(400).json(invalid);
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;

    await user.save();

    res.status(200).json({
      message: "Xác thực tài khoản thành công!",
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// ======================================================
// 5. QUÊN MẬT KHẨU — GỬI OTP RESET
// ======================================================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const genericResponse = {
      message: "Nếu email tồn tại, mã OTP đã được gửi.",
    };

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const otp = generateOTP();

    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    await user.save();

    await sendOTPEmail(email, otp);

    res.status(200).json(genericResponse);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// ======================================================
// 6. ĐẶT LẠI MẬT KHẨU MỚI
// ======================================================
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({
        message: "Mật khẩu mới phải có ít nhất 6 ký tự",
      });
    }

    const user = await User.findOne({ email });

    const invalid = { message: "Mã OTP không đúng hoặc đã hết hạn." };

    if (!user || !user.otp || !user.otpExpires) {
      return res.status(400).json(invalid);
    }

    if (user.otpExpires < new Date()) {
      return res.status(400).json(invalid);
    }

    if (!isOTPMatch(user.otp, otp)) {
      return res.status(400).json(invalid);
    }

    user.password = newPassword; // hook pre("save") trong model tự hash
    user.otp = null;
    user.otpExpires = null;

    // Đặt lại được mật khẩu qua email nghĩa là email đã được xác minh
    user.isVerified = true;

    await user.save();

    res.status(200).json({ message: "Đặt lại mật khẩu thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
