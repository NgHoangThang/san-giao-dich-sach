const User = require("../models/User");
const bcrypt = require("bcryptjs");

// 1. Xem profile cá nhân
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "-password -otp -otpExpires",
    );
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// 2. Sửa thông tin cá nhân
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, university, phoneNumber } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user.userId,
      { fullName, university, phoneNumber },
      { new: true },
    ).select("-password -otp -otpExpires");
    res.status(200).json({ message: "Cập nhật thành công!", user: updated });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
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
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

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
    res.status(500).json({ message: "Lỗi server", error: error.message });
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
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
