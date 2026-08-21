import { io } from "socket.io-client";

// ĐÃ SỬA: URL viết cứng -> đọc từ biến môi trường
const SOCKET_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const socket = io(SOCKET_URL, {
  autoConnect: false,

  // ĐÃ THÊM: gửi kèm JWT ngay lúc bắt tay.
  // Backend giờ lấy danh tính từ token này chứ không tin userId
  // do client gửi lên nữa — đây là chỗ vá lỗ đọc lén tin nhắn.
  // Viết dạng hàm để mỗi lần kết nối lại đều lấy token mới nhất.
  auth: (cb) => {
    cb({ token: localStorage.getItem("token") || null });
  },

  // Tự kết nối lại khi Backend tạm ngắt
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,

  timeout: 10000,
});

// Sau khi đăng nhập / đăng xuất, gọi hàm này để socket dùng
// token mới. Không có nó thì socket vẫn giữ danh tính cũ cho tới
// khi tải lại trang.
export const reconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }

  socket.connect();
};

export default socket;
