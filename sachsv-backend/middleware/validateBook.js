const Joi = require("joi");

// Dùng cho CREATE — bắt buộc đầy đủ field.
// Khi dùng multipart/form-data (để upload ảnh kèm theo), các field text
// (price...) đến dưới dạng string. Joi tự convert string -> number theo
// mặc định (convert: true), nên không cần ép kiểu tay ở đây.
const validateBook = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(200).required(),
    author: Joi.string().min(2).allow("").optional(),
    publisher: Joi.string().allow("").optional(),
    isbn: Joi.string().allow("").optional(),
    year: Joi.number().integer().min(1000).optional(),
    pages: Joi.number().integer().min(1).optional(),
    weight: Joi.number().min(1).optional(),
    category: Joi.string()
      .valid(
        "Công nghệ thông tin",
        "Kinh tế",
        "Ngoại ngữ",
        "Y Dược",
        "Văn học",
        "Kỹ năng sống",
        "Giáo trình đại cương",
        "Khoa học - Kỹ thuật",
        "Luật",
        "Thiếu nhi - Truyện tranh",
      )
      .required(),
    price: Joi.number().min(0).required(),
    originalPrice: Joi.number().min(0).optional(),
    quantity: Joi.number().integer().min(1).optional(),
    condition: Joi.string().valid("new", "like-new", "used").required(),
    description: Joi.string().allow("").max(2000).optional(),
    // images không validate ở đây nữa — ảnh đã được Multer xử lý và
    // đẩy lên Cloudinary trước khi tới middleware này (xem upload.js).
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

// Dùng cho UPDATE — mọi field optional, chỉ validate field nào có gửi lên
const validateBookUpdate = (req, res, next) => {
  console.log("🔥 VALIDATE BOOK UPDATE — bản có quantity + description");

  const schema = Joi.object({
    title: Joi.string().min(3).max(200),
    author: Joi.string().min(2).allow(""),
    publisher: Joi.string().allow(""),
    isbn: Joi.string().allow(""),
    year: Joi.number().integer().min(1000),
    pages: Joi.number().integer().min(1),
    weight: Joi.number().min(1),
    category: Joi.string().valid(
      "Công nghệ thông tin",
      "Kinh tế",
      "Ngoại ngữ",
      "Y Dược",
      "Văn học",
      "Kỹ năng sống",
      "Giáo trình đại cương",
      "Khoa học - Kỹ thuật",
      "Luật",
      "Thiếu nhi - Truyện tranh",
    ),
    price: Joi.number().min(0),
    originalPrice: Joi.number().min(0).allow(null, ""),
    quantity: Joi.number().integer().min(0),
    condition: Joi.string().valid("new", "like-new", "used"),
    description: Joi.string().allow("").max(2000),
    images: Joi.array().items(Joi.string().uri()),
    // ĐÃ THÊM: danh sách URL ảnh cần xóa, gửi kèm khi sửa sách.
    // Không khai báo ở đây thì Joi coi là field lạ và chặn ngay (400).
    removeImages: Joi.any(),
    status: Joi.string().valid("available", "sold", "hidden"),
  }).min(1);

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      message: "Dữ liệu không hợp lệ",
      details: error.details[0].message,
    });
  }
  next();
};

module.exports = { validateBook, validateBookUpdate };
