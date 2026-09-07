require("dotenv").config();
const mongoose = require("mongoose");

// ======================================================
// GÁN TẠM TÊN/ẢNH CHO CÁC ITEM ĐƠN HÀNG "MỒ CÔI"
// ------------------------------------------------------
// Sau khi migrate-order-items.js chạy, một số đơn cũ có item với
// title = "(Sách không còn tồn tại)" vì sách gốc đã bị xóa hẳn khỏi
// hệ thống trước đây — đơn cũ không lưu snapshot đủ để khôi phục tên
// thật. Theo yêu cầu, các item này được gán tạm tên + ảnh của cuốn
// "Giáo trình Triết học Mác - Lênin" (vẫn còn bán) để giao diện hiển
// thị đẹp thay vì "(Sách không còn tồn tại)". Đây CHỈ là gán hiển thị
// cho đẹp, KHÔNG phải khôi phục đúng sách khách đã mua thật sự.
//
// CÁCH CHẠY:
//   1. XEM TRƯỚC (không ghi gì):
//        node relabel-orphaned-order-items.js
//   2. Ghi thật:
//        node relabel-orphaned-order-items.js --confirm
// ======================================================

const ORPHAN_TITLE = "(Sách không còn tồn tại)";
const TARGET_TITLE = "Giáo trình Triết học Mác - Lênin";
const TARGET_BOOK_ID = "6a816539a950e7d662850ee6";

const isConfirmed = process.argv.includes("--confirm");

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("❌ Thiếu MONGODB_URI trong .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Đã kết nối MongoDB\n");

  const db = mongoose.connection.db;
  const orders = db.collection("orders");
  const books = db.collection("books");

  const targetBook = await books.findOne({
    _id: new mongoose.Types.ObjectId(TARGET_BOOK_ID),
  });

  if (!targetBook) {
    console.error(`❌ Không tìm thấy sách đích _id=${TARGET_BOOK_ID}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const affectedOrders = await orders
    .find({ "items.title": ORPHAN_TITLE })
    .sort({ createdAt: 1 })
    .toArray();

  console.log("===== XEM TRƯỚC =====");
  console.log(`Sách đích: "${targetBook.title}" (_id=${TARGET_BOOK_ID})`);
  console.log(`Số đơn có item mồ côi: ${affectedOrders.length}\n`);

  let totalItems = 0;

  affectedOrders.forEach((order) => {
    const orphanItems = (order.items || []).filter(
      (item) => item.title === ORPHAN_TITLE,
    );

    totalItems += orphanItems.length;

    orphanItems.forEach((item) => {
      console.log(
        `  ${order._id}  [${order.status}]  price=${item.price}  x${item.quantity}`,
      );
    });
  });

  console.log(`\nTổng số item sẽ được gán lại: ${totalItems}`);

  if (!isConfirmed) {
    console.log("\n⚠️  Đây chỉ là XEM TRƯỚC — CHƯA GHI GÌ vào MongoDB.");
    console.log("   Kiểm tra lại danh sách trên, nếu đúng thì chạy:");
    console.log("   node relabel-orphaned-order-items.js --confirm\n");

    await mongoose.disconnect();
    process.exit(0);
  }

  console.log("\n===== ĐANG GHI VÀO MONGODB... =====");

  const result = await orders.updateMany(
    { "items.title": ORPHAN_TITLE },
    {
      $set: {
        "items.$[elem].title": TARGET_TITLE,
        "items.$[elem].bookId": targetBook._id,
      },
    },
    {
      arrayFilters: [{ "elem.title": ORPHAN_TITLE }],
    },
  );

  console.log(
    `✔ Đã cập nhật ${result.modifiedCount} / ${affectedOrders.length} đơn.\n`,
  );

  const stillOrphaned = await orders.countDocuments({
    "items.title": ORPHAN_TITLE,
  });

  console.log(
    `Kiểm tra lại: còn ${stillOrphaned} đơn có item mồ côi (phải là 0).`,
  );

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("❌ Lỗi:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
