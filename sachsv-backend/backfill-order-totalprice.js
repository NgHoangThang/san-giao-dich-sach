require("dotenv").config();
const mongoose = require("mongoose");

// ======================================================
// BACKFILL totalPrice/quantity CHO ORDER CŨ
// ------------------------------------------------------
// Một số Order cũ (tạo trước khi field totalPrice/quantity tồn tại
// trong schema) đang thiếu 2 field này. Script này chỉ set cho đúng
// những đơn ĐANG THIẾU totalPrice — không đụng tới đơn đã có sẵn.
//   quantity   = 1 (mặc định duy nhất hợp lý, không thể khôi phục
//                số lượng thật đã mất)
//   totalPrice = price (vì price luôn là đơn giá 1 cuốn, xác nhận
//                qua toàn bộ code tạo Order trong project)
//
// CÁCH CHẠY (bắt buộc theo đúng thứ tự):
//   1. XEM TRƯỚC (không ghi gì):
//        node backfill-order-totalprice.js
//   2. Xem kỹ danh sách in ra, nếu đúng như mong đợi mới chạy:
//        node backfill-order-totalprice.js --confirm
// ======================================================

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

  const missing = await orders
    .find({ totalPrice: { $exists: false } })
    .project({ status: 1, price: 1 })
    .sort({ createdAt: 1 })
    .toArray();

  console.log("===== XEM TRƯỚC =====");
  console.log(`Số đơn sẽ backfill: ${missing.length}\n`);

  missing.forEach((order) => {
    console.log(
      `  ${order._id}  [${order.status}]  price=${order.price} ` +
        `-> quantity=1, totalPrice=${order.price}`,
    );
  });

  if (!isConfirmed) {
    console.log("\n⚠️  Đây chỉ là XEM TRƯỚC — CHƯA GHI GÌ vào MongoDB.");
    console.log("   Kiểm tra lại danh sách trên, nếu đúng thì chạy:");
    console.log("   node backfill-order-totalprice.js --confirm\n");

    await mongoose.disconnect();
    process.exit(0);
  }

  console.log("\n===== ĐANG GHI VÀO MONGODB... =====");

  const result = await orders.updateMany(
    { totalPrice: { $exists: false } },
    [
      {
        $set: {
          quantity: { $ifNull: ["$quantity", 1] },
          totalPrice: "$price",
        },
      },
    ],
  );

  console.log(
    `✔ Đã cập nhật ${result.modifiedCount} / ${result.matchedCount} đơn.\n`,
  );

  const stillMissing = await orders.countDocuments({
    totalPrice: { $exists: false },
  });

  console.log(
    `Kiểm tra lại: còn ${stillMissing} đơn thiếu totalPrice (phải là 0).`,
  );

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("❌ Lỗi:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
