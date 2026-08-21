const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ======================================================
// XÁC THỰC SOCKET.IO NGAY TỪ LÚC BẮT TAY (HANDSHAKE)
// ------------------------------------------------------
// Trang công khai (vd: xem hồ sơ người bán) vẫn cần socket
// để hỏi trạng thái online, nên KHÔNG chặn khách vãng lai.
// Thay vào đó:
//   - Có token hợp lệ  -> socket.data.userId + role  (thành viên)
//   - Không có token   -> socket.data.userId = null  (khách)
// Việc chặn vào phòng riêng được xử lý ở index.js.
// ======================================================
const socketAuth = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    // Khách vãng lai — cho kết nối, nhưng không có danh tính
    if (!token) {
      socket.data.userId = null;
      socket.data.role = null;
      return next();
    }

    if (!process.env.JWT_SECRET) {
      return next(new Error("Server chưa cấu hình JWT_SECRET"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Lấy quyền hiện tại từ DB, KHÔNG tin role nằm trong token.
    // Nhờ vậy admin gỡ quyền hoặc khóa tài khoản là có hiệu lực ngay
    // ở lần kết nối kế tiếp, không phải chờ token hết hạn.
    const user = await User.findById(decoded.userId).select("role isLocked");

    if (!user || user.isLocked) {
      return next(new Error("Tài khoản không hợp lệ hoặc đã bị khóa"));
    }

    socket.data.userId = String(user._id);
    socket.data.role = user.role;

    return next();
  } catch (error) {
    // Token hỏng/hết hạn -> hạ xuống mức khách vãng lai thay vì
    // ngắt hẳn, để trang công khai không vỡ khi token cũ còn sót lại
    socket.data.userId = null;
    socket.data.role = null;
    return next();
  }
};

module.exports = socketAuth;
