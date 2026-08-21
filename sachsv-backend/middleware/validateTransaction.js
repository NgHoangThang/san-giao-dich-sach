const Joi = require("joi");

// ======================================================
// 1. VALIDATE KHI USER ĐẶT MUA SÁCH
// ======================================================
exports.validateOrder = (req, res, next) => {
  // DÒNG KIỂM TRA BACKEND
  console.log("🔥 VALIDATE ORDER MỚI ĐANG CHẠY");
  console.log("📦 BODY NHẬN ĐƯỢC:", req.body);

  const schema = Joi.object({
    // ==================================================
    // ID SÁCH
    // ==================================================
    bookId: Joi.string().hex().length(24).required().messages({
      "string.base": "ID sách không hợp lệ",
      "string.hex": "ID sách phải là chuỗi hexa",
      "string.length": "ID sách phải có đúng 24 ký tự",
      "any.required": "Thiếu ID sách",
    }),

    // ==================================================
    // SỐ LƯỢNG ĐẶT MUA (không bắt buộc, mặc định 1 ở controller)
    // ==================================================
    quantity: Joi.number().integer().min(1).max(50).messages({
      "number.base": "Số lượng không hợp lệ",
      "number.integer": "Số lượng phải là số nguyên",
      "number.min": "Số lượng phải lớn hơn 0",
      "number.max": "Số lượng tối đa mỗi đơn là 50 cuốn",
    }),

    // ==================================================
    // THÔNG TIN GIAO HÀNG
    // ==================================================
    shippingAddress: Joi.object({
      // Họ tên người nhận
      receiverName: Joi.string().trim().min(2).max(100).required().messages({
        "string.empty": "Vui lòng nhập họ tên người nhận",
        "string.min": "Họ tên người nhận quá ngắn",
        "string.max": "Họ tên người nhận quá dài",
        "any.required": "Thiếu họ tên người nhận",
      }),

      // Số điện thoại
      phoneNumber: Joi.string()
        .trim()
        .pattern(/^[0-9+\s.-]{9,15}$/)
        .required()
        .messages({
          "string.empty": "Vui lòng nhập số điện thoại",
          "string.pattern.base": "Số điện thoại không hợp lệ",
          "any.required": "Thiếu số điện thoại",
        }),

      // Số nhà / đường / khóm / ấp
      addressLine: Joi.string().trim().min(3).max(200).required().messages({
        "string.empty": "Vui lòng nhập địa chỉ",
        "string.min": "Địa chỉ quá ngắn",
        "string.max": "Địa chỉ quá dài",
        "any.required": "Thiếu địa chỉ",
      }),

      // Phường / Xã
      ward: Joi.string().trim().min(2).max(100).required().messages({
        "string.empty": "Vui lòng nhập Phường/Xã",
        "any.required": "Thiếu Phường/Xã",
      }),

      // Tỉnh / Thành phố
      province: Joi.string().trim().min(2).max(100).required().messages({
        "string.empty": "Vui lòng nhập Tỉnh/Thành phố",
        "any.required": "Thiếu Tỉnh/Thành phố",
      }),

      // Ghi chú
      note: Joi.string().trim().allow("").max(300).messages({
        "string.max": "Ghi chú không được vượt quá 300 ký tự",
      }),
    })
      .required()
      .messages({
        "object.base": "Thông tin giao hàng không hợp lệ",
        "any.required": "Vui lòng nhập thông tin giao hàng",
      }),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    console.log("❌ VALIDATE ORDER LỖI:", error.details[0].message);

    return res.status(400).json({
      message: "Dữ liệu không hợp lệ",
      details: error.details[0].message,
    });
  }

  console.log("✅ VALIDATE ORDER THÀNH CÔNG");

  next();
};

// ======================================================
// 2. VALIDATE KHI USER VIẾT ĐÁNH GIÁ
// ======================================================
exports.validateReview = (req, res, next) => {
  const schema = Joi.object({
    orderId: Joi.string().hex().length(24).required().messages({
      "string.base": "ID đơn hàng không hợp lệ",
      "string.hex": "ID đơn hàng phải là chuỗi hexa",
      "string.length": "ID đơn hàng phải có đúng 24 ký tự",
      "any.required": "Thiếu ID đơn hàng",
    }),

    rating: Joi.number().integer().min(1).max(5).required().messages({
      "number.base": "Số sao không hợp lệ",
      "number.min": "Đánh giá thấp nhất là 1 sao",
      "number.max": "Đánh giá cao nhất là 5 sao",
      "any.required": "Vui lòng chọn số sao",
    }),

    comment: Joi.string().trim().allow("").max(500).messages({
      "string.max": "Bình luận không được vượt quá 500 ký tự",
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
