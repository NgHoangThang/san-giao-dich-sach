require("dotenv").config();

const axios = require("axios");

// ĐÃ SỬA: trước đây token JWT thật bị hard-code thẳng trong file này
// và nằm trong git history — ai đọc được source là có token (dù đã
// hết hạn). Giờ đọc từ biến môi trường TEST_JWT_TOKEN, không hard-code
// gì trong source nữa. Đăng nhập ở app để lấy 1 token còn hạn, rồi
// thêm dòng TEST_JWT_TOKEN=... vào sachsv-backend/.env trước khi chạy.
const token = process.env.TEST_JWT_TOKEN;

async function testOrder() {
  if (!token) {
    console.log(
      "❌ Thiếu TEST_JWT_TOKEN trong .env — đăng nhập để lấy 1 token JWT còn hạn rồi thêm dòng TEST_JWT_TOKEN=<token> vào sachsv-backend/.env trước khi chạy lại.",
    );
    return;
  }

  try {
    const res = await axios.post(
      "http://localhost:5000/api/orders/create",
      { bookId: "6a4781fdbdb756dfc5e63fdf" },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    console.log("✅ Kết quả:", res.data);
  } catch (err) {
    // Phân loại lỗi rõ ràng để không bị crash
    if (err.response) {
      console.log("❌ Lỗi từ logic Server:", err.response.data);
    } else {
      console.log("❌ Lỗi kết nối (Server đang tắt):", err.message);
    }
  }
}
testOrder();
