const User = require("../models/User");

const isAdmin = async (req, res, next) => {
  try {
    // 1. Lấy ID của người dùng đang gọi API
    // (authMiddleware chạy trước đã giải mã Token và lấy ra ID này)
    const userId = req.user.userId || req.user._id;

    // 2. Tìm người dùng trong Database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // 3. Kiểm tra xem Role có phải là admin không
    if (user.role !== "admin") {
      return res.status(403).json({
        message:
          "Truy cập bị từ chối. Chỉ Chủ shop (Admin) mới có quyền thực hiện hành động này!",
      });
    }

    // 4. Nếu đúng là Admin, cho phép đi tiếp vào hàm Controller
    next();
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi kiểm tra quyền Admin", error: error.message });
  }
};

module.exports = isAdmin;
