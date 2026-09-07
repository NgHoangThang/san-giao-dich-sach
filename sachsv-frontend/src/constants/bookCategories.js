// Danh sách category cố định — phải khớp enum "category" trong
// sachsv-backend/models/Book.js. Dùng chung cho dropdown lọc ở mọi
// trang thay vì tự suy ra từ dữ liệu đã fetch (không thể đầy đủ khi
// dữ liệu đã bị phân trang ở server).
export const BOOK_CATEGORIES = [
  "Công nghệ thông tin",
  "Kinh tế",
  "Ngoại ngữ",
  "Y Dược",
  "Văn học",
  "Kỹ năng sống",
  "Giáo trình đại cương",
  "Khoa học - Kỹ thuật",
  "Luật",
  "Thiếu nhi - Truyện tranh",
];
