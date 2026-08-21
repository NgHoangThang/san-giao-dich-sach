const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// Cấu hình nơi lưu file: thay vì lưu vào ổ cứng server, Multer sẽ
// đẩy trực tiếp file lên Cloudinary, vào folder "sachsv-books"
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "sachsv-books",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

// Giới hạn: tối đa 10 ảnh mỗi lần upload, mỗi ảnh tối đa 5MB
const upload = multer({
  storage: storage,
  limits: {
    files: 10,
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = upload;
