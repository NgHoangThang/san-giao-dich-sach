const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ======================================================
// XÁC THỰC TOKEN JWT
// ------------------------------------------------------
// ĐÃ SỬA: trước đây middleware này chỉ giải mã token rồi tin
// luôn { userId, role } nằm trong đó. Hậu quả:
//   - Admin khóa tài khoản -> người đó vẫn dùng được tới 7 ngày
//   - Admin hạ quyền       -> token cũ vẫn còn quyền admin
// Giờ mỗi request đều đối chiếu lại với DB (1 truy vấn nhẹ,
// chỉ lấy 3 field) nên chặn có hiệu lực ngay lập tức.
// ======================================================
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Không có token, vui lòng đăng nhập lại!",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "Server chưa cấu hình JWT_SECRET. Kiểm tra file .env",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select(
      "role isLocked isVerified",
    );

    if (!user) {
      return res.status(401).json({
        message: "Tài khoản không còn tồn tại!",
      });
    }

    if (user.isLocked) {
      return res.status(403).json({
        message:
          "Tài khoản của bạn đã bị khóa do vi phạm chính sách. Vui lòng liên hệ Ban Quản Trị.",
      });
    }

    // role lấy từ DB — đây mới là nguồn đáng tin
    req.user = {
      userId: String(user._id),
      _id: String(user._id),
      role: user.role,
      isVerified: user.isVerified,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token không hợp lệ hoặc đã hết hạn!",
    });
  }
};

module.exports = authMiddleware;
