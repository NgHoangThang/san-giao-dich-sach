const Joi = require("joi");

// ======================================================
// 1. VALIDATE KHI THÊM SÁCH VÀO GIỎ
// ======================================================
exports.validateAddToCart = (req, res, next) => {
  const schema = Joi.object({
    bookId: Joi.string().hex().length(24).required().messages({
      "string.hex": "ID sách không hợp lệ",
      "string.length": "ID sách phải có đúng 24 ký tự",
      "any.required": "Thiếu ID sách",
    }),

    quantity: Joi.number().integer().min(1).max(50).messages({
      "number.base": "Số lượng không hợp lệ",
      "number.integer": "Số lượng phải là số nguyên",
      "number.min": "Số lượng phải lớn hơn 0",
      "number.max": "Số lượng tối đa mỗi lần thêm là 50 cuốn",
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
// 2. VALIDATE KHI SỬA SỐ LƯỢNG 1 SÁCH TRONG GIỎ
// ======================================================
exports.validateUpdateCartItem = (req, res, next) => {
  const schema = Joi.object({
    quantity: Joi.number().integer().min(1).max(50).required().messages({
      "number.base": "Số lượng không hợp lệ",
      "number.integer": "Số lượng phải là số nguyên",
      "number.min": "Số lượng phải lớn hơn 0",
      "number.max": "Số lượng tối đa mỗi sách là 50 cuốn",
      "any.required": "Vui lòng nhập số lượng",
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
