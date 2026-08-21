require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const http = require("http");

const { Server } = require("socket.io");

const connectDB = require("./config/db");
const socketAuth = require("./middleware/socketAuth");
const Conversation = require("./models/Conversation");

// ======================================================
// KHỞI TẠO EXPRESS VÀ SOCKET.IO
// ======================================================
const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});

// Chia sẻ Socket.IO cho controller
app.set("io", io);

// Kết nối MongoDB
connectDB();

// ======================================================
// MIDDLEWARE
// ======================================================
app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

// ĐÃ SỬA: trước đây app.use(cors()) mở cho MỌI website trên
// Internet gọi API, trong khi Socket.IO ngay bên dưới lại giới
// hạn origin — hai chuẩn mâu thuẫn trong cùng một file.
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);

app.use(helmet());
app.use(morgan("dev"));

// ======================================================
// ROUTES
// ======================================================
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const bookRoutes = require("./routes/bookRoutes");
app.use("/api/books", bookRoutes);

const conversationRoutes = require("./routes/conversationRoutes");
app.use("/api/conversations", conversationRoutes);

const messageRoutes = require("./routes/messageRoutes");
app.use("/api/messages", messageRoutes);

const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

const wishlistRoutes = require("./routes/wishlistRoutes");
app.use("/api/wishlist", wishlistRoutes);

const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);

// ======================================================
// ADDRESS
// ======================================================
const addressRoutes = require("./routes/addressRoutes");
app.use("/api/addresses", addressRoutes);
const shopRoutes = require("./routes/shopRoutes");
app.use("/api/shop", shopRoutes);

const reviewRoutes = require("./routes/reviewRoutes");
app.use("/api/reviews", reviewRoutes);

const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);

const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

const reportRoutes = require("./routes/reportRoutes");
app.use("/api/reports", reportRoutes);

// ======================================================
// SOCKET.IO
// ======================================================
// LỖ HỔNG ĐÃ VÁ:
// Trước đây mọi sự kiện đều tin dữ liệu client gửi lên. Hậu quả:
//   - join_conversation <id bất kỳ>  -> đọc lén tin nhắn riêng tư
//     của người khác theo thời gian thực
//   - register_notification <userId người khác> -> nhận thông báo
//     của họ
//   - join_admin_room -> ai cũng vào nghe được sự kiện admin
//
// Cách vá: danh tính lấy từ JWT ở handshake (socketAuth), client
// gửi userId lên cũng bị bỏ qua; vào phòng chat phải đối chiếu DB.
// ======================================================

io.use(socketAuth);

// Map<userId, Set<socketId>> — theo dõi ai đang online
const onlineUsers = new Map();

app.set("onlineUsers", onlineUsers);

io.on("connection", (socket) => {
  const currentUserId = socket.data.userId; // null nếu là khách vãng lai

  console.log(
    `🔌 Kết nối: ${socket.id}${currentUserId ? ` (user ${currentUserId})` : " (khách)"}`,
  );

  // ==================================================
  // ĐĂNG KÝ PHÒNG THÔNG BÁO CÁ NHÂN
  // Không nhận userId từ client nữa — lấy từ token.
  // ==================================================
  const registerNotificationRoom = () => {
    if (!currentUserId) return;

    socket.join(currentUserId);

    const wasOffline = !onlineUsers.has(currentUserId);

    if (wasOffline) {
      onlineUsers.set(currentUserId, new Set());
    }

    onlineUsers.get(currentUserId).add(socket.id);

    // Chỉ báo "vừa online" khi đây là thiết bị/tab đầu tiên
    if (wasOffline) {
      io.emit("user_status_changed", {
        userId: currentUserId,
        isOnline: true,
      });
    }
  };

  // Tự vào phòng ngay khi kết nối — không cần chờ client gọi
  registerNotificationRoom();

  // Vẫn lắng nghe sự kiện cũ để frontend hiện tại không phải sửa,
  // nhưng THAM SỐ CLIENT GỬI LÊN BỊ BỎ QUA HOÀN TOÀN
  socket.on("register_notification", () => {
    registerNotificationRoom();
  });

  // ==================================================
  // PHÒNG ADMIN — kiểm quyền thật, không cho tự nhận
  // ==================================================
  socket.on("join_admin_room", () => {
    if (socket.data.role !== "admin") {
      console.warn(`⛔ ${socket.id} cố vào phòng admin nhưng không có quyền`);
      return;
    }

    socket.join("admin_room");

    console.log(`🛡️ ${socket.id} đã vào phòng theo dõi admin.`);
  });

  // ==================================================
  // TRẠNG THÁI ONLINE — công khai, khách cũng hỏi được
  // ==================================================
  socket.on("get_online_status", (userId, callback) => {
    const isOnline = onlineUsers.has(String(userId || ""));

    if (typeof callback === "function") {
      callback({ isOnline });
    }
  });

  // ==================================================
  // VÀO PHÒNG HỘI THOẠI — phải là thành viên của cuộc trò chuyện
  // ==================================================
  socket.on("join_conversation", async (conversationId) => {
    if (!conversationId || !currentUserId) return;

    try {
      // Đối chiếu DB: người này có nằm trong participants không?
      const isParticipant = await Conversation.exists({
        _id: conversationId,
        participants: currentUserId,
      });

      if (!isParticipant) {
        console.warn(
          `⛔ User ${currentUserId} cố vào phòng chat ${conversationId} không thuộc về mình`,
        );
        return;
      }

      socket.join(String(conversationId));

      console.log(`User ${currentUserId} đã vào phòng chat: ${conversationId}`);
    } catch (error) {
      console.error("Lỗi join_conversation:", error.message);
    }
  });

  // Rời phòng thì không cần kiểm gì — chỉ tự rời phòng của mình
  socket.on("leave_conversation", (conversationId) => {
    if (!conversationId) return;

    socket.leave(String(conversationId));
  });

  socket.on("disconnect", () => {
    console.log(`❌ Ngắt kết nối: ${socket.id}`);

    if (!currentUserId) return;

    const sockets = onlineUsers.get(currentUserId);

    if (!sockets) return;

    sockets.delete(socket.id);

    // Chỉ báo "offline" khi không còn tab nào của người này kết nối
    if (sockets.size === 0) {
      onlineUsers.delete(currentUserId);

      io.emit("user_status_changed", {
        userId: currentUserId,
        isOnline: false,
      });
    }
  });
});

// ======================================================
// ROUTE KIỂM TRA SERVER
// ======================================================
app.get("/", (req, res) => {
  res.send("🚀 API Sàn Giao Dịch Sách Sinh Viên đang hoạt động tốt!");
});

// ======================================================
// ERROR HANDLER
// ======================================================
const { errorHandler, notFound } = require("./middleware/errorHandler");

app.use(notFound);
app.use(errorHandler);

// ======================================================
// KHỞI ĐỘNG SERVER
// ======================================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại port ${PORT}`);
});
