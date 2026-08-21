const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Thêm tùy chọn để cải thiện độ ổn định khi kết nối với Atlas
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000, // Tăng thời gian chờ đợi phản hồi từ server
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
