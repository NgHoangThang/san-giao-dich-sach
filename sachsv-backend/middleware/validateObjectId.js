const mongoose = require("mongoose");

// ======================================================
// CHẶN ID SAI ĐỊNH DẠNG TRƯỚC KHI TỚI CONTROLLER
// ------------------------------------------------------
// ĐÃ THÊM: trước đây các route dạng /:id gọi thẳng
// Model.findById(req.params.id) — nếu id không đúng định dạng
// ObjectId (24 ký tự hex), Mongoose ném CastError, rơi vào catch
// chung của controller và trả về HTTP 500 kèm message kỹ thuật nội
// bộ (lộ tên model/field), trong khi đây là lỗi do client gửi sai,
// đúng ra phải là 400. Middleware này chặn sớm, trả 400 rõ ràng,
// không cần sửa gì trong các controller.
// ======================================================
const validateObjectId =
  (paramName = "id") =>
  (req, res, next) => {
    const value = req.params[paramName];

    const isValid =
      mongoose.Types.ObjectId.isValid(value) && String(value).length === 24;

    if (!isValid) {
      return res.status(400).json({
        message: `Tham số "${paramName}" không hợp lệ`,
      });
    }

    next();
  };

module.exports = validateObjectId;
