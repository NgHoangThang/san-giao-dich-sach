// ĐÃ SỬA: trước đây các trang dùng chung link "via.placeholder.com" làm
// ảnh dự phòng khi sách/avatar chưa có ảnh — dịch vụ này đã ngừng hoạt
// động (không tải được), khiến trình duyệt hiện icon ảnh vỡ thay vì
// khung ảnh xám như mong muốn. Đổi sang tạo ảnh SVG nhúng thẳng bằng
// data URI, không phụ thuộc dịch vụ ngoài nào cả.
export const getPlaceholderImage = (width, height, label = "") => {
  const fontSize = Math.max(10, Math.floor(Math.min(width, height) / 6));

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="#E5E7EB"/>` +
    `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ` +
    `font-family="Arial, sans-serif" font-size="${fontSize}" fill="#9CA3AF">${label}</text>` +
    `</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};
