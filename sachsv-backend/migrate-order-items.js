require("dotenv").config();
const mongoose = require("mongoose");

// ======================================================
// MIGRATE ORDER SANG ĐỊNH DẠNG items[]
// ------------------------------------------------------
// Chuyển các Order cũ (bookId/price/quantity ở cấp cao nhất) sang
// định dạng mới items: [{ bookId, title, price, quantity }].
//   - title lấy từ Book hiện tại nếu sách còn tồn tại, nếu sách đã
//     bị xóa hẳn thì dùng "(Sách không còn tồn tại)" làm placeholder
//     — không có cách nào khôi phục lại tên gốc vì đơn cũ chưa từng
//     lưu snapshot title.
//   - Chỉ động vào đơn CHƯA CÓ field items (định dạng cũ), không
//     đụng đơn đã đúng định dạng mới.
//
// CÁCH CHẠY:
//   1. XEM TRƯỚC (không ghi gì):
//        node migrate-order-items.js
//   2. Ghi thật:
//        node migrate-order-items.js --confirm
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
  const books = db.collection("books");

  const oldFormatOrders = await orders
    .find({ items: { $exists: false } })
    .sort({ createdAt: 1 })
    .toArray();

  console.log("===== XEM TRƯỚC =====");
  console.log(`Số đơn sẽ migrate: ${oldFormatOrders.length}\n`);

  const nonTerminal = ["pending", "confirmed", "preparing", "shipping", "delivered"];

  let plans = [];

  for (const order of oldFormatOrders) {
    const book = order.bookId
      ? await books.findOne({ _id: order.bookId })
      : null;

    const title = book?.title || "(Sách không còn tồn tại)";

    const newItems = [
      {
        bookId: order.bookId,
        title,
        price: order.price,
        quantity: order.quantity || 1,
      },
    ];

    plans.push({
      _id: order._id,
      status: order.status,
      urgent: nonTerminal.includes(order.status),
      items: newItems,
    });
  }

  plans.forEach((plan) => {
    const flag = plan.urgent ? " ⚠️ ĐANG HOẠT ĐỘNG" : "";

    console.log(
      `  ${plan._id}  [${plan.status}]${flag}  -> items: [{ title: "${plan.items[0].title}", price: ${plan.items[0].price}, quantity: ${plan.items[0].quantity} }]`,
    );
  });

  const urgentCount = plans.filter((p) => p.urgent).length;

  console.log(`\nTrong đó có ${urgentCount} đơn đang hoạt động (ưu tiên cao).`);

  if (!isConfirmed) {
    console.log("\n⚠️  Đây chỉ là XEM TRƯỚC — CHƯA GHI GÌ vào MongoDB.");
    console.log("   Kiểm tra lại danh sách trên, nếu đúng thì chạy:");
    console.log("   node migrate-order-items.js --confirm\n");

    await mongoose.disconnect();
    process.exit(0);
  }

  console.log("\n===== ĐANG GHI VÀO MONGODB... =====");

  let updatedCount = 0;

  for (const plan of plans) {
    await orders.updateOne(
      { _id: plan._id },
      {
        $set: { items: plan.items },
        $unset: { bookId: "", price: "", quantity: "" },
      },
    );

    updatedCount += 1;
  }

  console.log(`✔ Đã migrate ${updatedCount} / ${plans.length} đơn.\n`);

  const stillOldFormat = await orders.countDocuments({ items: { $exists: false } });

  console.log(
    `Kiểm tra lại: còn ${stillOldFormat} đơn ở định dạng cũ (phải là 0).`,
  );

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("❌ Lỗi:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
