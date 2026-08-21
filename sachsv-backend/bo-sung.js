require("dotenv").config();

const mongoose = require("mongoose");

const User = require("./models/User");
const Book = require("./models/Book");
const Order = require("./models/Order");
const Conversation = require("./models/Conversation");
const Wishlist = require("./models/Wishlist");

const img = (s) => `https://picsum.photos/seed/${s}/500/700`;
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

// Sách bổ sung cho 9 danh mục đang trống
const sachMoi = [
  {
    title: "Clean Code - Mã Sạch",
    author: "Robert C. Martin",
    category: "Công nghệ thông tin",
    price: 145000,
    originalPrice: 220000,
    condition: "like-new",
    quantity: 12,
    pages: 464,
    weight: 600,
    description:
      "Sách gối đầu giường của lập trình viên. Tình trạng gần như mới.",
  },
  {
    title: "Giáo trình Cấu trúc dữ liệu và Giải thuật",
    author: "Nguyễn Văn Linh",
    category: "Công nghệ thông tin",
    price: 60000,
    condition: "used",
    quantity: 25,
    pages: 320,
    weight: 450,
    description: "Giáo trình chuẩn dùng ở nhiều trường kỹ thuật.",
  },
  {
    title: "JavaScript - Ngôn ngữ lập trình hiện đại",
    author: "Ilya Kantor",
    category: "Công nghệ thông tin",
    price: 180000,
    condition: "new",
    quantity: 8,
    pages: 700,
    weight: 850,
    description: "Sách mới nguyên seal.",
  },
  {
    title: "IELTS Cambridge 18 - Trọn bộ",
    author: "Cambridge University Press",
    category: "Ngoại ngữ",
    price: 120000,
    originalPrice: 180000,
    condition: "like-new",
    quantity: 14,
    pages: 200,
    weight: 350,
    description: "Chưa làm bài, còn nguyên đáp án.",
  },
  {
    title: "Từ điển Anh - Việt 120.000 từ",
    author: "Viện Ngôn ngữ học",
    category: "Ngoại ngữ",
    price: 85000,
    condition: "used",
    quantity: 7,
    pages: 1500,
    weight: 1200,
    description: "Từ điển dày, tra cứu tiện.",
  },
  {
    title: "Giải Phẫu Người - Tập 1",
    author: "Nguyễn Quang Quyền",
    category: "Y Dược",
    price: 210000,
    originalPrice: 300000,
    condition: "like-new",
    quantity: 5,
    pages: 450,
    weight: 900,
    description: "Sách kinh điển ngành Y, hình ảnh màu rõ nét.",
  },
  {
    title: "Dược Lý Học Lâm Sàng",
    author: "Bộ Y Tế",
    category: "Y Dược",
    price: 165000,
    condition: "used",
    quantity: 4,
    pages: 600,
    weight: 800,
    description: "Có ghi chú ở phần kháng sinh.",
  },
  {
    title: "Số Đỏ",
    author: "Vũ Trọng Phụng",
    category: "Văn học",
    price: 45000,
    condition: "used",
    quantity: 20,
    pages: 220,
    weight: 250,
    description: "Tác phẩm kinh điển văn học Việt Nam.",
  },
  {
    title: "Nhà Giả Kim",
    author: "Paulo Coelho",
    category: "Văn học",
    price: 52000,
    originalPrice: 79000,
    condition: "like-new",
    quantity: 18,
    pages: 180,
    weight: 220,
    description: "Một trong những cuốn bán chạy nhất mọi thời đại.",
  },
  {
    title: "Đắc Nhân Tâm",
    author: "Dale Carnegie",
    category: "Kỹ năng sống",
    price: 48000,
    originalPrice: 88000,
    condition: "used",
    quantity: 22,
    pages: 320,
    weight: 350,
    description: "Sách bán chạy nhất của shop.",
  },
  {
    title: "Tư Duy Nhanh Và Chậm",
    author: "Daniel Kahneman",
    category: "Kỹ năng sống",
    price: 115000,
    condition: "like-new",
    quantity: 9,
    pages: 600,
    weight: 650,
    description: "Sách hay về tâm lý học hành vi.",
  },
  {
    title: "Giáo trình Triết học Mác - Lênin",
    author: "Bộ Giáo dục và Đào tạo",
    category: "Giáo trình đại cương",
    price: 35000,
    condition: "used",
    quantity: 40,
    pages: 280,
    weight: 380,
    description: "Sinh viên năm nhất trường nào cũng cần.",
  },
  {
    title: "Giáo trình Toán Cao Cấp A1",
    author: "Nguyễn Đình Trí",
    category: "Giáo trình đại cương",
    price: 42000,
    condition: "used",
    quantity: 35,
    pages: 350,
    weight: 450,
    description: "Có lời giải chi tiết cuối chương.",
  },
  {
    title: "Vật Lý Đại Cương - Tập 2",
    author: "Lương Duyên Bình",
    category: "Khoa học - Kỹ thuật",
    price: 58000,
    condition: "used",
    quantity: 16,
    pages: 400,
    weight: 520,
    description: "Phần Điện - Từ, giáo trình chuẩn.",
  },
  {
    title: "Giáo trình Luật Dân sự Việt Nam",
    author: "Đại học Luật Hà Nội",
    category: "Luật",
    price: 88000,
    condition: "like-new",
    quantity: 8,
    pages: 480,
    weight: 600,
    description: "Bản cập nhật theo Bộ luật Dân sự 2015.",
  },
  {
    title: "Doraemon - Trọn bộ 10 tập đầu",
    author: "Fujiko F. Fujio",
    category: "Thiếu nhi - Truyện tranh",
    price: 150000,
    originalPrice: 250000,
    condition: "used",
    quantity: 3,
    pages: 1900,
    weight: 1500,
    description: "Bộ sưu tập tuổi thơ.",
  },
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Đã kết nối MongoDB\n");

  const admin = await User.findOne({ role: "admin" });
  const khach = await User.find({ role: { $ne: "admin" } });

  if (!admin || khach.length === 0) {
    console.error("❌ Thiếu admin hoặc không có người dùng thường.");
    await mongoose.disconnect();
    process.exit(1);
  }

  // ==================================================
  // 1. XÁC THỰC EMAIL CHO TÀI KHOẢN CŨ
  // Sau bản vá, chưa xác thực = không đăng nhập được
  // ==================================================
  const kqXacThuc = await User.updateMany(
    { isVerified: false },
    { $set: { isVerified: true } },
  );
  console.log(`✔ Đã xác thực ${kqXacThuc.modifiedCount} tài khoản\n`);

  // ==================================================
  // 2. THÊM SÁCH CHO CÁC DANH MỤC ĐANG TRỐNG
  // Bỏ qua cuốn nào đã tồn tại (chạy lại vẫn an toàn)
  // ==================================================
  let demThem = 0;

  for (let i = 0; i < sachMoi.length; i += 1) {
    const daCo = await Book.findOne({ title: sachMoi[i].title });
    if (daCo) continue;

    await Book.create({
      ...sachMoi[i],
      sellerId: admin._id,
      images: [img(`bk${i}a`), img(`bk${i}b`)],
      createdAt: daysAgo(sachMoi.length - i),
    });

    demThem += 1;
  }
  console.log(`✔ Đã thêm ${demThem} cuốn sách mới\n`);

  const tatCaSach = await Book.find({ status: "available" });

  // ==================================================
  // 3. GẮN LẠI ĐƠN HỎNG VÀO SÁCH CÒN SỐNG
  // Không xóa đơn nào — chỉ đổi bookId sang sách thật
  // ==================================================
  const idSach = tatCaSach.map((b) => b._id);

  const donHong = await Order.find({ bookId: { $nin: idSach } });

  for (let i = 0; i < donHong.length; i += 1) {
    const sach = tatCaSach[i % tatCaSach.length];

    await Order.updateOne(
      { _id: donHong[i]._id },
      { $set: { bookId: sach._id, sellerId: admin._id } },
    );
  }
  console.log(`✔ Đã gắn lại ${donHong.length} đơn hàng vào sách thật`);

  const hoiThoaiHong = await Conversation.find({ bookId: { $nin: idSach } });

  for (let i = 0; i < hoiThoaiHong.length; i += 1) {
    await Conversation.updateOne(
      { _id: hoiThoaiHong[i]._id },
      { $set: { bookId: tatCaSach[i % tatCaSach.length]._id } },
    );
  }
  console.log(`✔ Đã gắn lại ${hoiThoaiHong.length} hội thoại`);

  const wlHong = await Wishlist.find({ bookId: { $nin: idSach } });

  for (let i = 0; i < wlHong.length; i += 1) {
    await Wishlist.updateOne(
      { _id: wlHong[i]._id },
      { $set: { bookId: tatCaSach[i % tatCaSach.length]._id } },
    );
  }
  console.log(`✔ Đã gắn lại ${wlHong.length} wishlist\n`);

  // ==================================================
  // 4. TẠO ĐƠN Ở 4 TRẠNG THÁI ĐANG THIẾU
  // ==================================================
  const luong = ["pending", "confirmed", "preparing", "shipping"];

  const ghiChu = {
    pending: "Đơn hàng đã được tạo. Đang chờ shop xác nhận.",
    confirmed: "Shop đã xác nhận đơn hàng.",
    preparing: "Shop đang đóng gói đơn hàng.",
    shipping: "Đơn hàng đã bàn giao cho đơn vị vận chuyển.",
  };

  let demDon = 0;

  for (let i = 0; i < luong.length; i += 1) {
    const trangThai = luong[i];

    const daCo = await Order.countDocuments({ status: trangThai });
    if (daCo > 0) continue;

    const buyer = khach[i % khach.length];
    const sach = tatCaSach[i % tatCaSach.length];

    const lichSu = luong
      .slice(0, i + 1)
      .map((s, j) => ({
        status: s,
        note: ghiChu[s],
        updatedAt: daysAgo(i - j * 0.3),
      }));

    await Order.create({
      buyerId: buyer._id,
      sellerId: admin._id,
      bookId: sach._id,
      price: sach.price,
      quantity: 1,
      totalPrice: sach.price,
      shippingAddress: {
        receiverName: buyer.fullName,
        phoneNumber: buyer.phoneNumber || "0900000000",
        addressLine: "97 Man Thiện",
        ward: "Phường Hiệp Phú",
        district: "TP. Thủ Đức",
        province: "TP. Hồ Chí Minh",
        note: "Giao giờ hành chính",
      },
      status: trangThai,
      statusHistory: lichSu,
      shippingProvider: trangThai === "shipping" ? "Giao Hàng Tiết Kiệm" : "",
      trackingCode: trangThai === "shipping" ? "GHTK482913" : "",
      createdAt: daysAgo(i + 1),
    });

    demDon += 1;
  }
  console.log(`✔ Đã tạo ${demDon} đơn hàng mới\n`);

  // ==================================================
  // TỔNG KẾT
  // ==================================================
  const theoDanhMuc = await Book.aggregate([
    { $group: { _id: "$category", soLuong: { $sum: 1 } } },
    { $sort: { soLuong: -1 } },
  ]);

  const theoTrangThai = await Order.aggregate([
    { $group: { _id: "$status", soLuong: { $sum: 1 } } },
  ]);

  const dem = Object.fromEntries(theoTrangThai.map((s) => [s._id, s.soLuong]));

  console.log("==================================================");
  console.log(`Sách : ${await Book.countDocuments()} cuốn`);
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
  ].forEach((s) => console.log(`  ${s.padEnd(11)}: ${dem[s] || 0}`));

  console.log(
    `\nCòn đơn trỏ vào sách đã xóa: ${await Order.countDocuments({ bookId: { $nin: idSach } })}`,
  );
  console.log("==================================================\n");

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (e) => {
  console.error("❌ Lỗi:", e);
  await mongoose.disconnect();
  process.exit(1);
});
