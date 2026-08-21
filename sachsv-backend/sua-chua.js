require("dotenv").config();

const mongoose = require("mongoose");

const User = require("./models/User");
const Book = require("./models/Book");
const Order = require("./models/Order");
const Conversation = require("./models/Conversation");
const Wishlist = require("./models/Wishlist");
const Review = require("./models/Review");

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Đã kết nối MongoDB\n");

  // 1. TÌM ADMIN
  const admin = await User.findOne({ role: "admin" }).select(
    "_id fullName email",
  );

  if (!admin) {
    console.error("❌ Không tìm thấy tài khoản admin nào.");
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log("===== ADMIN =====");
  console.log(`${admin.fullName} <${admin.email}>\n`);

  // 2. GÁN LẠI SÁCH MỒ CÔI VỀ ADMIN
  const idNguoiDungThat = await User.distinct("_id");

  const sachMoCoi = await Book.find({
    sellerId: { $nin: idNguoiDungThat },
  }).select("title");

  console.log("===== SÁCH MỒ CÔI =====");

  if (sachMoCoi.length === 0) {
    console.log("Không có. Bỏ qua.\n");
  } else {
    console.log(`${sachMoCoi.length} cuốn không thuộc về ai:`);
    sachMoCoi.forEach((b) => console.log(`  - ${b.title}`));

    const kq = await Book.updateMany(
      { sellerId: { $nin: idNguoiDungThat } },
      { $set: { sellerId: admin._id } },
    );

    console.log(`\n✔ Đã gán ${kq.modifiedCount} cuốn về cho admin.\n`);
  }

  // 3. THAY ẢNH CỤC BỘ BẰNG ẢNH WEB
  const sachAnhHong = await Book.find({
    images: { $elemMatch: { $not: /^https?:\/\// } },
  }).select("images");

  console.log("===== ẢNH =====");

  if (sachAnhHong.length === 0) {
    console.log("Ảnh đều hợp lệ. Bỏ qua.\n");
  } else {
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

  // 4. BÁO CÁO THAM CHIẾU HỎNG
  const idSachConLai = await Book.distinct("_id");

  const donHong = await Order.find({ bookId: { $nin: idSachConLai } }).select(
    "status createdAt",
  );

  console.log("===== TRỎ VÀO SÁCH ĐÃ XÓA =====");
  console.log(`Đơn hàng  : ${donHong.length}`);
  console.log(
    `Hội thoại : ${await Conversation.countDocuments({ bookId: { $nin: idSachConLai } })}`,
  );
  console.log(
    `Wishlist  : ${await Wishlist.countDocuments({ bookId: { $nin: idSachConLai } })}`,
  );

  // 5. TỔNG KẾT
  const theoDanhMuc = await Book.aggregate([
    { $group: { _id: "$category", soLuong: { $sum: 1 } } },
    { $sort: { soLuong: -1 } },
  ]);

  const theoTrangThai = await Order.aggregate([
    { $group: { _id: "$status", soLuong: { $sum: 1 } } },
  ]);

  const demDon = Object.fromEntries(
    theoTrangThai.map((s) => [s._id, s.soLuong]),
  );

  console.log("\n==================================================");
  console.log("HIỆN TRẠNG");
  console.log("==================================================");

  console.log(`\nNgười dùng : ${await User.countDocuments()}`);
  console.log(
    `  chưa xác thực email: ${await User.countDocuments({ isVerified: false })}`,
  );
  console.log(
    `  đang bị khóa       : ${await User.countDocuments({ isLocked: true })}`,
  );

  console.log(`\nSách : ${await Book.countDocuments()} cuốn`);
  theoDanhMuc.forEach((c) => console.log(`  ${c._id}: ${c.soLuong}`));

  console.log("\nĐơn hàng:");
  [
    "pending",
    "confirmed",
    "preparing",
    "shipping",
    "delivered",
    "completed",
    "cancelled",
  ].forEach((s) => console.log(`  ${s.padEnd(11)}: ${demDon[s] || 0}`));

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
