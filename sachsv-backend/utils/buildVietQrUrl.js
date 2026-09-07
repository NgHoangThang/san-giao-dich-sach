// ======================================================
// SINH ẢNH QR CHUYỂN KHOẢN NGÂN HÀNG (chuẩn VietQR/Napas 247)
// ------------------------------------------------------
// Dùng dịch vụ ảnh công khai img.vietqr.io — không cần đăng ký cổng
// thanh toán, không cần secret key. Ảnh QR tự điền sẵn số tiền + nội
// dung chuyển khoản, khách chỉ cần quét bằng app ngân hàng bất kỳ hỗ
// trợ VietQR.
// ======================================================
const buildVietQrUrl = (amount, content) => {
  const bankBin = process.env.PAYMENT_BANK_BIN;
  const accountNo = process.env.PAYMENT_ACCOUNT_NO;
  const accountName = process.env.PAYMENT_ACCOUNT_NAME;

  const params = new URLSearchParams({
    amount: String(Math.round(Number(amount) || 0)),
    addInfo: content,
    accountName,
  });

  return `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?${params.toString()}`;
};

// Nội dung chuyển khoản ngắn, dễ đối chiếu trên sao kê ngân hàng
const buildPaymentContent = (orderId) => {
  const shortId = String(orderId).slice(-8).toUpperCase();

  return `DH${shortId}`;
};

module.exports = { buildVietQrUrl, buildPaymentContent };
