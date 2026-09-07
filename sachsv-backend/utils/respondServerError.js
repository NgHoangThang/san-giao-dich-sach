// ĐÃ THÊM: trước đây mọi catch block trong controller đều trả thẳng
// error.message (chi tiết kỹ thuật nội bộ của Mongoose/thư viện) ra
// client, bất kể môi trường chạy là gì. Giờ chỉ trả error.message khi
// không phải production (tiện debug lúc code), còn production chỉ
// thấy message chung. Log server vẫn đầy đủ như cũ.
const respondServerError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);

  return res.status(500).json({
    message: fallbackMessage,
    ...(process.env.NODE_ENV !== "production" && { error: error.message }),
  });
};

module.exports = respondServerError;
