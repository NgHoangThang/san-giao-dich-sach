require("dotenv").config();

const mongoose = require("mongoose");

const User = require("./models/User");
const Book = require("./models/Book");
const Order = require("./models/Order");
const Conversation = require("./models/Conversation");
const Wishlist = require("./models/Wishlist");
const Review = require("./models/Review");

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("❌ Thiếu MONGODB_URI trong file .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Đã kết nối MongoDB\n");

  // ==================================================
  // 1. TÌM TÀI KHOẢN ADMIN
  // ==================================================
  const admin = await User.findOne({ role: "admin" }).select(
    "_id fullName email",
  );

  if (!admin) {
    console.error("❌ Không tìm thấy tài khoản nào có role = 'admin'.");
    console.error("   Kiểm tra lại collection users trước khi chạy tiếp.");
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log("===== TÀI KHOẢN ADMIN =====");
  console.log(`${admin.fullName} <${admin.email}>`);
  console.log(`_id: ${admin._id}\n`);

  // ==================================================
  // 2. GÁN LẠI CHỦ SỞ HỮU SÁCH
  // Sách do seed cũ tạo mang sellerId bịa, không thuộc
  // về ai -> populate("sellerId") trả null -> trang chi
  // tiết sách văng lỗi. Gán hết về admin.
  // ==================================================
  const idNguoiDungThat = await User.distinct("_id");

  const sachMoCoi = await Book.find({
    sellerId: { $nin: idNguoiDungThat },
  }).select("_id title");

  console.log("===== SÁCH MỒ CÔI =====");

  if (sachMoCoi.length === 0) {
    console.log("Không có cuốn nào mồ côi. Bỏ qua.\n");
  } else {
    console.log(`Tìm thấy ${sachMoCoi.length} cuốn không thuộc về ai:`);
    sachMoCoi.forEach((b) => console.log(`  - ${b.title}`));

    const ketQua = await Book.updateMany(
      { sellerId: { $nin: idNguoiDungThat } },
      { $set: { sellerId: admin._id } },
    );

    console.log(`\n✔ Đã gán ${ketQua.modifiedCount} cuốn về cho admin.\n`);
  }

  // ==================================================
  // 3. THAY ẢNH TRỎ VÀO FILE CỤC BỘ
  // seed cũ dùng đường dẫn kiểu "/images/nlđ.jpg" —
  // tên có dấu tiếng Việt, file có thể không tồn tại.
  // ==================================================
  const sachAnhHong = await Book.find({
    images: { $elemMatch: { $not: /^https?:\/\// } },
  }).select("_id title images");

  console.log("===== ẢNH SÁCH =====");

  if (sachAnhHong.length === 0) {
    console.log("Mọi ảnh đều là đường dẫn web hợp lệ. Bỏ qua.\n");
  } else {
    console.log(`${sachAnhHong.length} cuốn có ảnh trỏ vào file cục bộ.`);

    for (const book of sachAnhHong) {
      const anhMoi = book.images.map((url, i) =>
        /^https?:\/\//.test(url)
          ? url
          : `https://picsum.photos/seed/${book._id}-${i}/500/700`,
      );

      await Book.updateOne({ _id: book._id }, { $set: { images: anhMoi } });
    }

    console.log(`✔ Đã thay ảnh cho ${sachAnhHong.length} cuốn.\n`);
  }

  // ==================================================
  // 4. BÁO CÁO THAM CHIẾU HỎNG
  // Sách cũ đã bị xóa, nên đơn hàng / hội thoại / wishlist
  // trỏ vào chúng sẽ hiển thị lỗi. Script CHỈ BÁO CÁO,
  // không tự xóa — bạn tự quyết định xử lý thế nào.
  // ==================================================
  const idSachConLai = await Book.distinct("_id");

  const donHong = await Order.find({
    bookId: { $nin: idSachConLai },
  }).select("_id status createdAt");

  const hoiThoaiHong = await Conversation.countDocuments({
    bookId: { $nin: idSachConLai },
  });

  const wishlistHong = await Wishlist.countDocuments({
    bookId: { $nin: idSachConLai },
  });

  console.log("===== THAM CHIẾU TỚI SÁCH ĐÃ BỊ XÓA =====");
  console.log(`Đơn hàng  : ${donHong.length}`);
  console.log(`Hội thoại : ${hoiThoaiHong}`);
  console.log(`Wishlist  : ${wishlistHong}`);

  if (donHong.length > 0) {
    console.log("\nDanh sách đơn hàng bị ảnh hưởng:");
    donHong.forEach((o) =>
      console.log(
        `  ${o._id}  [${o.status}]  ${new Date(o.createdAt).toLocaleDateString("vi-VN")}`,
      ),
    );
    console.log(
      "\n⚠️  Mấy đơn này trỏ vào sách không còn tồn tại. Mở trang Đơn hàng",
    );
    console.log("   có thể hiển thị lỗi. Hai cách xử lý:");
    console.log("   (a) Xóa chúng đi cho sạch — nếu chỉ là đơn test");
    console.log(
      "   (b) Giữ lại, nhưng phải sửa giao diện chịu được bookId null",
    );
  }

  // ==================================================
  // 5. TỔNG KẾT HIỆN TRẠNG
  // ==================================================
  const tongSach = await Book.countDocuments();

  const theoDanhMuc = await Book.aggregate([
    { $group: { _id: "$category", soLuong: { $sum: 1 } } },
    { $sort: { soLuong: -1 } },
  ]);

  const theoTrangThaiDon = await Order.aggregate([
    { $group: { _id: "$status", soLuong: { $sum: 1 } } },
  ]);

  const demDon = Object.fromEntries(
    theoTrangThaiDon.map((s) => [s._id, s.soLuong]),
  );

  console.log("\n==================================================");
  console.log("HIỆN TRẠNG SAU KHI CHỮA");
  console.log("==================================================");

  console.log(`\nNgười dùng : ${await User.countDocuments()}`);
  console.log(
    `  chưa xác thực email: ${await User.countDocuments({ isVerified: false })}  ← không đăng nhập được sau bản vá`,
  );
  console.log(
    `  đang bị khóa       : ${await User.countDocuments({ isLocked: true })}`,
  );

  console.log(`\nSách : ${tongSach} cuốn`);
  theoDanhMuc.forEach((c) => console.log(`  ${c._id}: ${c.soLuong}`));

  console.log("\nĐơn hàng theo trạng thái:");
  [
    "pending",
    "confirmed",
    "preparing",
    "shipping",
    "delivered",
    "completed",
    "cancelled",
  ].forEach((s) =>
    console.log(
      `  ${s.padEnd(11)}: ${demDon[s] || 0}${demDon[s] ? "" : "   ← trống, demo không có gì để xem"}`,
    ),
  );

  console.log(`\nĐánh giá : ${await Review.countDocuments()}`);
  console.log("==================================================\n");

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("❌ Lỗi:", error);
  await mongoose.disconnect();
  process.exit(1);
});
