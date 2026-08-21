import axios from "axios";

// ĐÃ SỬA: trước đây baseURL bị viết cứng "http://localhost:5000",
// deploy lên là hỏng. Giờ đọc từ biến môi trường, vẫn để localhost
// làm mặc định để chạy máy nhà không phải cấu hình gì.
export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ======================================================
// REQUEST: tự gắn token
// ======================================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Khi gửi FormData (ví dụ đăng sách kèm ảnh), phải để trình duyệt tự
    // đặt Content-Type kèm "boundary". Nếu giữ nguyên "application/json"
    // mặc định của instance, backend (multer) sẽ không đọc được cả field
    // text lẫn file trong multipart -> trả về lỗi 400.
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ======================================================
// RESPONSE: xử lý token hết hạn / tài khoản bị khóa
// ------------------------------------------------------
// ĐÃ THÊM: trước đây không có interceptor này, nên khi token hết
// hạn người dùng gặp lỗi lung tung ở khắp nơi mà không hiểu vì sao.
// ======================================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const onAuthPage = ["/login", "/register", "/forgot-password"].includes(
      window.location.pathname,
    );

    if (status === 401 && !onAuthPage) {
      localStorage.removeItem("token");
      delete api.defaults.headers.common.Authorization;

      // Dùng replace để người dùng bấm "quay lại" không rơi vào
      // trang cần đăng nhập rồi bị đá ra lần nữa
      window.location.replace("/login");
    }

    return Promise.reject(error);
  },
);

export default api;
