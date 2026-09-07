const Joi = require("joi");

const validateRegister = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Email không đúng định dạng",
      "any.required": "Email là bắt buộc",
      "string.empty": "Không được để trống email",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
      "any.required": "Mật khẩu là bắt buộc",
      "string.empty": "Không được để trống mật khẩu",
    }),
    fullName: Joi.string().min(2).max(50).required().messages({
      "string.min": "Họ tên phải có ít nhất 2 ký tự",
      "any.required": "Họ tên là bắt buộc",
      "string.empty": "Không được để trống họ tên",
    }),
    university: Joi.string().allow("").optional(),
    phoneNumber: Joi.string()
      .pattern(/^[0-9]{10,11}$/)
      .allow("")
      .optional()
      .messages({
        "string.pattern.base": "Số điện thoại chỉ được chứa 10-11 chữ số",
      }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      message: "Dữ liệu không hợp lệ",
      details: error.details[0].message,
    });
  }
  next();
};

// ======================================================
// VALIDATE KHI USER SỬA HỒ SƠ CÁ NHÂN (PUT /api/users/profile)
// ------------------------------------------------------
// ĐÃ THÊM: route này trước đây không có Joi nào chặn trước, nên
// fullName rỗng/toàn khoảng trắng lọt xuống tận findByIdAndUpdate()
// mà không bị chặn (Mongoose không tự chạy "required" khi update
// nếu không bật runValidators). Chỉ validate đúng 3 field
// updateProfile thực sự nhận (fullName, university, phoneNumber) —
// field lạ (role, email, password, isLocked...) không được khai báo
// ở đây nên Joi sẽ tự báo lỗi "not allowed" nếu client cố gửi kèm.
// ======================================================
const validateUpdateProfile = (req, res, next) => {
  const schema = Joi.object({
    fullName: Joi.string().trim().min(2).max(50).required().messages({
      "string.empty": "Họ tên không được để trống",
      "string.min": "Họ tên phải có ít nhất 2 ký tự",
      "string.max": "Họ tên không được vượt quá 50 ký tự",
      "any.required": "Họ tên là bắt buộc",
    }),
    university: Joi.string().trim().allow("").max(100).optional().messages({
      "string.max": "Tên trường không được vượt quá 100 ký tự",
    }),
    // Chưa có yêu cầu nghiệp vụ rõ ràng về định dạng số điện thoại
    // cho hồ sơ cá nhân (khác với địa chỉ giao hàng/đơn hàng), nên
    // chỉ validate kiểu chuỗi, không ép định dạng 9-11 chữ số.
    phoneNumber: Joi.string().trim().allow("").optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      message: "Dữ liệu không hợp lệ",
      details: error.details[0].message,
    });
  }
  next();
};

// ======================================================
// VALIDATE KHI USER ĐỔI MẬT KHẨU (PUT /api/users/change-password)
// ------------------------------------------------------
// ĐÃ THÊM: route này trước đây không có Joi nào chặn trước, và
// User.password trong model chỉ có "required: true" (không có
// minlength) -> đổi mật khẩu mới xuống còn 1 ký tự vẫn lưu được vì
// controller gọi user.save() thẳng, không qua bước validate độ dài
// nào. Áp cùng rule "tối thiểu 6 ký tự" như lúc đăng ký để nhất
// quán — không thể đăng ký mật khẩu mạnh rồi đổi về yếu hơn.
// ======================================================
const validateChangePassword = (req, res, next) => {
  const schema = Joi.object({
    oldPassword: Joi.string().required().messages({
      "string.empty": "Vui lòng nhập mật khẩu hiện tại",
      "any.required": "Vui lòng nhập mật khẩu hiện tại",
    }),
    newPassword: Joi.string().min(6).required().messages({
      "string.min": "Mật khẩu mới phải có ít nhất 6 ký tự",
      "string.empty": "Vui lòng nhập mật khẩu mới",
      "any.required": "Vui lòng nhập mật khẩu mới",
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      message: "Dữ liệu không hợp lệ",
      details: error.details[0].message,
    });
  }
  next();
};

module.exports = {
  validateRegister,
  validateUpdateProfile,
  validateChangePassword,
};
