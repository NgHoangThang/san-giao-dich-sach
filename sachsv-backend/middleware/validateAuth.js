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

module.exports = { validateRegister };
