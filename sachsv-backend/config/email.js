const nodemailer = require("nodemailer");

// ======================================================
// CẤU HÌNH GỬI EMAIL
// ======================================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Chống chèn mã HTML từ dữ liệu người dùng
const escapeHtml = (value = "") => {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

// ======================================================
// 1. GỬI EMAIL OTP
// ======================================================
const sendOTPEmail = async (toEmail, otp) => {
  await transporter.sendMail({
    from: `"Sàn Giao Dịch Sách SV" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Mã xác thực OTP của bạn",
    html: `
      <div
        style="
          font-family: Arial, sans-serif;
          max-width: 400px;
          margin: auto;
          padding: 20px;
          border: 1px solid #eeeeee;
          border-radius: 10px;
        "
      >
        <h2 style="color: #333333;">
          Xác thực tài khoản
        </h2>

        <p>Mã OTP của bạn là:</p>

        <h1
          style="
            color: #4CAF50;
            letter-spacing: 8px;
          "
        >
          ${escapeHtml(otp)}
        </h1>

        <p>
          Mã có hiệu lực trong
          <strong>5 phút</strong>.
        </p>

        <p
          style="
            color: #999999;
            font-size: 12px;
          "
        >
          Nếu bạn không yêu cầu mã này, hãy bỏ qua email.
        </p>
      </div>
    `,
  });
};

// ======================================================
// 2. GỬI EMAIL KHI ĐƠN HÀNG ĐƯỢC XÁC NHẬN
// ======================================================
const sendOrderAcceptedEmail = async ({
  toEmail,
  buyerName,
  bookTitle,
  price,
  orderId,
  sellerName,
  sellerEmail,
  sellerPhone,
}) => {
  const formattedPrice = Number(price || 0).toLocaleString("vi-VN");

  await transporter.sendMail({
    from: `"Sàn Giao Dịch Sách SV" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Đơn mua sách "${bookTitle}" đã được xác nhận`,
    html: `
      <div
        style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          background-color: #f7f7f7;
          padding: 24px;
        "
      >
        <div
          style="
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #eeeeee;
          "
        >
          <div
            style="
              background-color: #1C2B39;
              color: #ffffff;
              padding: 22px;
              text-align: center;
            "
          >
            <h1
              style="
                margin: 0;
                font-size: 24px;
              "
            >
              Đơn hàng đã được xác nhận
            </h1>
          </div>

          <div style="padding: 24px;">
            <p>
              Xin chào
              <strong>${escapeHtml(buyerName || "bạn")}</strong>,
            </p>

            <p>
              Người bán đã xác nhận yêu cầu mua sách của bạn.
            </p>

            <div
              style="
                background-color: #FBF7EE;
                border: 1px solid #E3DCC8;
                border-radius: 8px;
                padding: 16px;
                margin: 20px 0;
              "
            >
              <p style="margin: 6px 0;">
                <strong>Tên sách:</strong>
                ${escapeHtml(bookTitle || "Không xác định")}
              </p>

              <p style="margin: 6px 0;">
                <strong>Giá:</strong>
                ${formattedPrice} đ
              </p>

              <p style="margin: 6px 0;">
                <strong>Mã đơn hàng:</strong>
                ${escapeHtml(orderId)}
              </p>

              <p style="margin: 6px 0;">
                <strong>Trạng thái:</strong>
                <span style="color: #16803C;">
                  Đã xác nhận
                </span>
              </p>
            </div>

            <h3 style="color: #333333;">
              Thông tin người bán
            </h3>

            <p style="margin: 6px 0;">
              <strong>Họ tên:</strong>
              ${escapeHtml(sellerName || "Chưa cập nhật")}
            </p>

            <p style="margin: 6px 0;">
              <strong>Email:</strong>
              ${escapeHtml(sellerEmail || "Chưa cập nhật")}
            </p>

            <p style="margin: 6px 0;">
              <strong>Số điện thoại:</strong>
              ${escapeHtml(sellerPhone || "Chưa cập nhật")}
            </p>

            <p style="margin-top: 22px;">
              Bạn có thể truy cập trang
              <strong>Đơn hàng</strong>
              trên website để kiểm tra trạng thái giao dịch.
            </p>

            <p>
              Vui lòng liên hệ với người bán để thống nhất thời gian
              và địa điểm giao nhận sách.
            </p>
          </div>

          <div
            style="
              background-color: #f3f3f3;
              padding: 14px;
              text-align: center;
              color: #777777;
              font-size: 12px;
            "
          >
            Email được gửi tự động từ Sàn Giao Dịch Sách SV.
          </div>
        </div>
      </div>
    `,
  });
};

module.exports = {
  sendOTPEmail,
  sendOrderAcceptedEmail,
};
