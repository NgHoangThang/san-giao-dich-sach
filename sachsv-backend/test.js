const axios = require("axios");

async function testOrder() {
  try {
    const res = await axios.post(
      "http://localhost:5000/api/orders/create",
      { bookId: "6a4781fdbdb756dfc5e63fdf" },
      {
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTQ3Nzc1MWJkYjc1NmRmYzVlNjNmZGUiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4MzQxMjg2NSwiZXhwIjoxNzg0MDE3NjY1fQ.fqk2zMgDK_De-LuQD05nDsotxbLjYejYRCPMMO4TGUk",
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
