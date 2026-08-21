const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);

  // Xử lý riêng lỗi từ Multer (upload ảnh) để trả thông báo rõ ràng, dễ hiểu
  if (err.name === "MulterError") {
    let message = "Lỗi khi tải ảnh lên.";

    if (err.code === "LIMIT_FILE_COUNT") {
      message = "Bạn chỉ được tải lên tối đa 10 ảnh.";
    } else if (err.code === "LIMIT_FILE_SIZE") {
      message = "Mỗi ảnh chỉ được tối đa 5MB.";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Trường ảnh không hợp lệ.";
    }

    return res.status(400).json({ message });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message || "Lỗi máy chủ nội bộ",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Không tìm thấy đường dẫn - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound };
