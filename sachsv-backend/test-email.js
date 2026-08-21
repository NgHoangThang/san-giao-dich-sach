require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

transporter.verify((error, success) => {
  if (error) {
    console.log("❌ Lỗi:", error.message);
  } else {
    console.log("✅ Email config OK — sẵn sàng gửi mail!");
  }
});
