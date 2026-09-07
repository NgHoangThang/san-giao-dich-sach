const User = require("../models/User");
const bcrypt = require("bcryptjs");
const respondServerError = require("../utils/respondServerError");

// 1. Xem profile cá nhân
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "-password -otp -otpExpires",
    );
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    res.status(200).json(user);
  } catch (error) {
    respondServerError(res, error, "Lỗi server");
  }
};

// 2. Sửa thông tin cá nhân
// ĐÃ SỬA: findByIdAndUpdate() trước đây không bật runValidators, nên
// "required" của fullName trong User model không có tác dụng khi
// update (chỉ áp dụng cho save()/create()) -> fullName rỗng vẫn lưu
// được. Giờ bật runValidators + context: "query" (bắt buộc để các
// validator kiểu hàm trong schema, nếu có, đọc đúng dữ liệu đang
// update thay vì document cũ). Chỉ 3 field fullName/university/
// phoneNumber được đưa vào update — field lạ đã bị validateUpdateProfile
// (Joi) chặn từ trước khi tới đây.
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, university, phoneNumber } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user.userId,
      { fullName, university, phoneNumber },
      { new: true, runValidators: true, context: "query" },
    ).select("-password -otp -otpExpires");

    if (!updated) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    res.status(200).json({ message: "Cập nhật thành công!", user: updated });
  } catch (error) {
    respondServerError(res, error, "Lỗi server");
  }
};

// 3. Upload avatar
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Chưa chọn ảnh" });
    const avatarUrl = req.file.path;
    const updated = await User.findByIdAndUpdate(
      req.user.userId,
      { avatar: avatarUrl },
      { new: true },
    ).select("-password -otp -otpExpires");
    res
      .status(200)
      .json({ message: "Upload avatar thành công!", user: updated });
  } catch (error) {
    respondServerError(res, error, "Lỗi server");
  }
};

// 4. Đổi mật khẩu
// 4. Đổi mật khẩu
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });

    user.password = newPassword;
    await user.save(); // pre-save hook tự hash
    res.status(200).json({ message: "Đổi mật khẩu thành công!" });
  } catch (error) {
    respondServerError(res, error, "Lỗi server");
  }
};

// 5. Xem profile người khác (theo ID)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "fullName university avatar createdAt",
    );
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    res.status(200).json(user);
  } catch (error) {
    respondServerError(res, error, "Lỗi server");
  }
};
