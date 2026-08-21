const Order = require("../models/Order");
const Review = require("../models/Review");
const Book = require("../models/Book");
const User = require("../models/User");
const ShippingTracking = require("../models/ShippingTracking");

const sendNotification = require("../utils/sendNotification");
const { sendOrderAcceptedEmail } = require("../config/email");

// ======================================================
// HÀM GỬI THÔNG BÁO AN TOÀN
// Notification lỗi sẽ không làm lỗi xử lý đơn hàng
// ======================================================
const sendSafeNotification = async (req, data) => {
  try {
    const io = req.app.get("io");

    await sendNotification({
      io,
      ...data,
    });
  } catch (error) {
    console.log("Không thể gửi thông báo:", error.message);
  }
};

// ======================================================
// PHÁT HOẠT ĐỘNG CHO ADMIN DASHBOARD
// ======================================================
const emitAdminActivity = (req, data) => {
  try {
    const io = req.app.get("io");

    if (!io) {
      return;
    }

    io.to("admin_room").emit("admin_activity", {
      ...data,
      at: new Date(),
    });
  } catch (error) {
    console.log("Không thể phát admin_activity:", error.message);
  }
};

// ======================================================
// KIỂM TRA SỐ ĐIỆN THOẠI
// ======================================================
const isValidPhoneNumber = (phoneNumber) => {
  const digits = String(phoneNumber || "").replace(/\D/g, "");

  return digits.length >= 9 && digits.length <= 11;
};

// ======================================================
// LƯU SHIPPING TRACKING AN TOÀN
// Tracking lỗi sẽ không làm hỏng Order chính
// ======================================================
const createShippingTrackingSafe = async ({
  orderId,
  status,
  title,
  location = "",
  note = "",
  shippingProvider = "",
  trackingCode = "",
  updatedBy = null,
}) => {
  try {
    const tracking = await ShippingTracking.create({
      orderId,
      status,
      title,
      location,
      note,
      shippingProvider,
      trackingCode,
      updatedBy,
    });

    console.log(`🚚 ShippingTracking: ${status} - Order ${orderId}`);

    return tracking;
  } catch (error) {
    console.error("❌ Không thể lưu ShippingTracking:", error.message);

    return null;
  }
};

// ======================================================
// 1. USER TẠO ĐƠN MUA SÁCH
// ======================================================
exports.createOrder = async (req, res) => {
  try {
    const { bookId, shippingAddress, quantity } = req.body || {};

    const buyerId = req.user.userId || req.user._id;

    // ==================================================
    // KIỂM TRA BOOK ID
    // ==================================================
    if (!bookId) {
      return res.status(400).json({
        message: "Vui lòng cung cấp mã sách",
      });
    }

    // ==================================================
    // KIỂM TRA SỐ LƯỢNG
    // ==================================================
    let orderQuantity = 1;

    if (quantity !== undefined && quantity !== null && quantity !== "") {
      orderQuantity = Number(quantity);

      if (!Number.isInteger(orderQuantity) || orderQuantity < 1) {
        return res.status(400).json({
          message: "Số lượng đặt mua không hợp lệ",
        });
      }
    }

    // ==================================================
    // KIỂM TRA ĐỊA CHỈ
    // ==================================================
    if (!shippingAddress) {
      return res.status(400).json({
        message: "Vui lòng nhập thông tin nhận hàng",
      });
    }

    const { receiverName, phoneNumber, addressLine, ward, province, note } =
      shippingAddress;

    if (!receiverName?.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập họ tên người nhận",
      });
    }

    if (!phoneNumber?.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập số điện thoại người nhận",
      });
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        message: "Số điện thoại người nhận không hợp lệ",
      });
    }

    if (!addressLine?.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập số nhà và tên đường",
      });
    }

    if (!ward?.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập Phường/Xã",
      });
    }

    if (!province?.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập Tỉnh/Thành phố",
      });
    }

    // ==================================================
    // TÌM SÁCH
    // ==================================================
    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({
        message: "Không tìm thấy sách",
      });
    }

    if (!book.sellerId) {
      return res.status(400).json({
        message: "Sách này chưa có thông tin người bán",
      });
    }

    // ==================================================
    // KHÔNG CHO MUA SÁCH CỦA CHÍNH MÌNH
    // ==================================================
    if (book.sellerId.toString() === buyerId.toString()) {
      return res.status(400).json({
        message: "Bạn không thể tự mua sách của chính mình",
      });
    }

    // ==================================================
    // CHỈ AVAILABLE MỚI ĐƯỢC MUA
    // ==================================================
    if (book.status !== "available") {
      let message = "Sách này hiện không thể đặt mua";

      if (book.status === "sold") {
        message = "Sách này đã được bán hết";
      }

      if (book.status === "hidden") {
        message = "Sách này hiện đang bị ẩn";
      }

      if (book.status === "deleted") {
        message = "Sách này không còn tồn tại";
      }

      return res.status(400).json({
        message,
      });
    }

    // ==================================================
    // KHÔNG CHO USER TẠO TRÙNG ĐƠN
    // ==================================================
    const existingOrder = await Order.findOne({
      buyerId,
      bookId,
      status: {
        $in: ["pending", "confirmed", "preparing", "shipping", "delivered"],
      },
    });

    if (existingOrder) {
      return res.status(400).json({
        message: "Bạn đã đặt mua cuốn sách này rồi.",
      });
    }

    // ==================================================
    // TRỪ KHO AN TOÀN
    // ==================================================
    const reservedBook = await Book.findOneAndUpdate(
      {
        _id: bookId,
        status: "available",
        quantity: {
          $gte: orderQuantity,
        },
      },
      {
        $inc: {
          quantity: -orderQuantity,
        },
      },
      {
        new: true,
      },
    );

    if (!reservedBook) {
      return res.status(400).json({
        message: `Sách chỉ còn lại không đủ ${orderQuantity} cuốn. Vui lòng chọn số lượng ít hơn.`,
      });
    }

    // ==================================================
    // NẾU HẾT HÀNG → SOLD
    // ==================================================
    if (reservedBook.quantity <= 0 && reservedBook.status !== "sold") {
      reservedBook.status = "sold";

      await reservedBook.save();
    }

    const now = new Date();

    // ==================================================
    // TẠO ORDER
    // ==================================================
    const newOrder = await Order.create({
      buyerId,

      sellerId: book.sellerId,

      bookId: book._id,

      price: book.price,

      quantity: orderQuantity,

      totalPrice: book.price * orderQuantity,

      shippingAddress: {
        receiverName: receiverName.trim(),

        phoneNumber: phoneNumber.trim(),

        addressLine: addressLine.trim(),

        ward: ward.trim(),

        province: province.trim(),

        note: note?.trim() || "",
      },

      status: "pending",

      statusHistory: [
        {
          status: "pending",

          note: "Đơn hàng đã được tạo. Đang chờ Admin xác nhận.",

          updatedAt: now,
        },
      ],
    });

    // ==================================================
    // SHIPPING TRACKING: PENDING
    // ==================================================
    await createShippingTrackingSafe({
      orderId: newOrder._id,

      status: "pending",

      title: "Đã đặt hàng",

      note: "Đơn hàng đã được tạo. Đang chờ Admin xác nhận.",

      updatedBy: buyerId,
    });

    // ==================================================
    // THÔNG BÁO ADMIN
    // ==================================================
    await sendSafeNotification(req, {
      receiverId: book.sellerId,

      senderId: buyerId,

      type: "order_created",

      title: "Có đơn đặt mua mới",

      message: `Sách "${book.title}" vừa có người đặt mua.`,

      relatedId: newOrder._id,
    });

    // ==================================================
    // REALTIME ADMIN DASHBOARD
    // ==================================================
    emitAdminActivity(req, {
      type: "order_created",

      message: `🛒 Đơn mua mới: "${book.title}" (SL: ${newOrder.quantity})`,

      amount: newOrder.totalPrice,
    });

    return res.status(201).json({
      message: "Đặt mua thành công! Đang chờ Admin xác nhận.",

      order: newOrder,
    });
  } catch (error) {
    console.error("Lỗi createOrder:", error);

    return res.status(500).json({
      message: "Lỗi server khi tạo đơn hàng",

      error: error.message,
    });
  }
};

// ======================================================
// 2. ADMIN XÁC NHẬN ĐƠN
// pending → confirmed
// ======================================================
exports.acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const sellerId = req.user.userId || req.user._id;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng",
      });
    }

    // ==================================================
    // KIỂM TRA QUYỀN
    // ==================================================
    if (order.sellerId.toString() !== sellerId.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền xác nhận đơn hàng này",
      });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        message: "Chỉ đơn đang chờ xác nhận mới có thể duyệt",
      });
    }

    const book = await Book.findById(order.bookId);

    if (!book) {
      return res.status(404).json({
        message: "Không tìm thấy sách của đơn hàng",
      });
    }

    const now = new Date();

    // ==================================================
    // CONFIRMED
    // ==================================================
    order.status = "confirmed";

    order.confirmedAt = now;

    order.shippingNote = "Admin đã xác nhận đơn hàng.";

    order.statusHistory.push({
      status: "confirmed",

      note: "Admin đã xác nhận đơn hàng.",

      updatedAt: now,
    });

    await order.save();

    // ==================================================
    // SHIPPING TRACKING: CONFIRMED
    // ==================================================
    await createShippingTrackingSafe({
      orderId: order._id,

      status: "confirmed",

      title: "Đơn hàng đã được xác nhận",

      note: "Admin đã xác nhận đơn hàng.",

      updatedBy: sellerId,
    });

    // ==================================================
    // LẤY BUYER + SELLER
    // ==================================================
    const [buyer, seller] = await Promise.all([
      User.findById(order.buyerId).select("email fullName"),

      User.findById(sellerId).select("email fullName phoneNumber"),
    ]);

    // ==================================================
    // THÔNG BÁO USER
    // ==================================================
    await sendSafeNotification(req, {
      receiverId: order.buyerId,

      senderId: sellerId,

      type: "order_accepted",

      title: "Đơn hàng đã được xác nhận",

      message: `Đơn mua sách "${book.title}" của bạn đã được Admin xác nhận.`,

      relatedId: order._id,
    });

    // ==================================================
    // EMAIL
    // ==================================================
    let emailSent = false;

    try {
      if (buyer?.email) {
        await sendOrderAcceptedEmail({
          toEmail: buyer.email,

          buyerName: buyer.fullName,

          bookTitle: book.title,

          price: order.price,

          orderId: order._id.toString(),

          sellerName: seller?.fullName || "Chưa cập nhật",

          sellerEmail: seller?.email || "Chưa cập nhật",

          sellerPhone: seller?.phoneNumber || "Chưa cập nhật",
        });

        emailSent = true;
      }
    } catch (emailError) {
      console.error("Không thể gửi email xác nhận:", emailError.message);
    }

    // ==================================================
    // ADMIN ACTIVITY
    // ==================================================
    emitAdminActivity(req, {
      type: "order_confirmed",

      message: `✅ Đã xác nhận đơn "${book.title}"`,

      amount: 0,
    });

    return res.status(200).json({
      message: "Đã xác nhận đơn hàng!",

      order,

      emailSent,
    });
  } catch (error) {
    console.error("Lỗi acceptOrder:", error);

    return res.status(500).json({
      message: "Lỗi server khi xác nhận đơn hàng",

      error: error.message,
    });
  }
};

// ======================================================
// 3. ADMIN BẮT ĐẦU CHUẨN BỊ HÀNG
// confirmed → preparing
// ======================================================
exports.prepareOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const sellerId = req.user.userId || req.user._id;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng",
      });
    }

    if (order.sellerId.toString() !== sellerId.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền xử lý đơn hàng này",
      });
    }

    if (order.status !== "confirmed") {
      return res.status(400).json({
        message: "Đơn hàng phải được xác nhận trước khi chuẩn bị.",
      });
    }

    const now = new Date();

    // ==================================================
    // PREPARING
    // ==================================================
    order.status = "preparing";

    order.preparingAt = now;

    order.shippingNote = "Admin đang chuẩn bị sách để giao.";

    order.statusHistory.push({
      status: "preparing",

      note: "Đơn hàng đang được chuẩn bị.",

      updatedAt: now,
    });

    await order.save();

    // ==================================================
    // SHIPPING TRACKING: PREPARING
    // ==================================================
    await createShippingTrackingSafe({
      orderId: order._id,

      status: "preparing",

      title: "Đang chuẩn bị sách",

      note: "Admin đang chuẩn bị sách để giao.",

      updatedBy: sellerId,
    });

    const book = await Book.findById(order.bookId).select("title");

    await sendSafeNotification(req, {
      receiverId: order.buyerId,

      senderId: sellerId,

      type: "order_preparing",

      title: "Đơn hàng đang được chuẩn bị",

      message: `Sách "${
        book?.title || "Không xác định"
      }" đang được chuẩn bị để giao cho bạn.`,

      relatedId: order._id,
    });

    return res.status(200).json({
      message: "Đã chuyển đơn sang trạng thái đang chuẩn bị.",

      order,
    });
  } catch (error) {
    console.error("Lỗi prepareOrder:", error);

    return res.status(500).json({
      message: "Lỗi server khi chuẩn bị đơn hàng",

      error: error.message,
    });
  }
};

// ======================================================
// 4. ADMIN BẮT ĐẦU GIAO HÀNG
// preparing → shipping
// ======================================================
exports.shipOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const sellerId = req.user.userId || req.user._id;

    const {
      shippingProvider,
      trackingCode,
      estimatedDeliveryDate,
      shippingNote,
    } = req.body || {};

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng",
      });
    }

    if (order.sellerId.toString() !== sellerId.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền giao đơn hàng này",
      });
    }

    if (order.status !== "preparing") {
      return res.status(400).json({
        message: "Chỉ đơn đang chuẩn bị mới có thể bắt đầu giao.",
      });
    }

    // ==================================================
    // KIỂM TRA THÔNG TIN VẬN CHUYỂN
    // ==================================================
    if (!shippingProvider?.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập đơn vị vận chuyển",
      });
    }

    if (!trackingCode?.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập mã vận đơn",
      });
    }

    if (!estimatedDeliveryDate) {
      return res.status(400).json({
        message: "Vui lòng chọn ngày dự kiến giao",
      });
    }

    const estimatedDate = new Date(estimatedDeliveryDate);

    if (Number.isNaN(estimatedDate.getTime())) {
      return res.status(400).json({
        message: "Ngày dự kiến giao không hợp lệ",
      });
    }

    const now = new Date();

    // ==================================================
    // SHIPPING
    // ==================================================
    order.status = "shipping";

    order.shippingAt = now;

    order.shippingProvider = shippingProvider.trim();

    order.trackingCode = trackingCode.trim();

    order.estimatedDeliveryDate = estimatedDate;

    order.shippingNote =
      shippingNote?.trim() ||
      "Đơn hàng đã được bàn giao cho đơn vị vận chuyển.";

    order.statusHistory.push({
      status: "shipping",

      note: order.shippingNote,

      updatedAt: now,
    });

    await order.save();

    // ==================================================
    // SHIPPING TRACKING: SHIPPING
    // ==================================================
    await createShippingTrackingSafe({
      orderId: order._id,

      status: "shipping",

      title: "Đã bắt đầu giao hàng",

      note: order.shippingNote,

      shippingProvider: order.shippingProvider,

      trackingCode: order.trackingCode,

      updatedBy: sellerId,
    });

    const book = await Book.findById(order.bookId).select("title");

    await sendSafeNotification(req, {
      receiverId: order.buyerId,

      senderId: sellerId,

      type: "order_shipping",

      title: "Đơn hàng đang được giao",

      message: `Đơn sách "${
        book?.title || "Không xác định"
      }" đã bắt đầu được giao.`,

      relatedId: order._id,
    });

    return res.status(200).json({
      message: "Đã bắt đầu giao hàng!",

      order,
    });
  } catch (error) {
    console.error("Lỗi shipOrder:", error);

    return res.status(500).json({
      message: "Lỗi server khi bắt đầu giao hàng",

      error: error.message,
    });
  }
};

// ======================================================
// 5. ADMIN CẬP NHẬT VẬN CHUYỂN
// shipping → shipping
// ======================================================
exports.updateShipping = async (req, res) => {
  try {
    const { id } = req.params;

    const sellerId = req.user.userId || req.user._id;

    const {
      shippingProvider,
      trackingCode,
      estimatedDeliveryDate,
      shippingNote,
      location,
    } = req.body || {};

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng",
      });
    }

    if (order.sellerId.toString() !== sellerId.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền cập nhật vận chuyển",
      });
    }

    if (order.status !== "shipping") {
      return res.status(400).json({
        message: "Chỉ đơn đang giao mới có thể cập nhật vận chuyển.",
      });
    }

    // ==================================================
    // PHẢI CÓ ÍT NHẤT 1 THÔNG TIN
    // ==================================================
    if (
      !shippingProvider &&
      !trackingCode &&
      !estimatedDeliveryDate &&
      !shippingNote &&
      !location
    ) {
      return res.status(400).json({
        message: "Vui lòng nhập thông tin cần cập nhật.",
      });
    }

    // ==================================================
    // UPDATE PROVIDER
    // ==================================================
    if (shippingProvider !== undefined) {
      order.shippingProvider = shippingProvider.trim();
    }

    // ==================================================
    // UPDATE TRACKING CODE
    // ==================================================
    if (trackingCode !== undefined) {
      order.trackingCode = trackingCode.trim();
    }

    // ==================================================
    // UPDATE ETA
    // ==================================================
    if (estimatedDeliveryDate) {
      const newDate = new Date(estimatedDeliveryDate);

      if (Number.isNaN(newDate.getTime())) {
        return res.status(400).json({
          message: "Ngày dự kiến giao không hợp lệ",
        });
      }

      order.estimatedDeliveryDate = newDate;
    }

    const now = new Date();

    // ==================================================
    // UPDATE SHIPPING NOTE
    // ==================================================
    if (shippingNote?.trim()) {
      order.shippingNote = shippingNote.trim();

      order.statusHistory.push({
        status: "shipping",

        note: shippingNote.trim(),

        updatedAt: now,
      });
    }

    await order.save();

    // ==================================================
    // TẠO THÊM SHIPPING TRACKING
    // Mỗi lần cập nhật = một document mới
    // ==================================================
    await createShippingTrackingSafe({
      orderId: order._id,

      status: "shipping",

      title: "Cập nhật vận chuyển",

      location: location?.trim() || "",

      note: shippingNote?.trim() || "Thông tin vận chuyển vừa được cập nhật.",

      shippingProvider: order.shippingProvider,

      trackingCode: order.trackingCode,

      updatedBy: sellerId,
    });

    const book = await Book.findById(order.bookId).select("title");

    // ==================================================
    // THÔNG BÁO USER
    // ==================================================
    await sendSafeNotification(req, {
      receiverId: order.buyerId,

      senderId: sellerId,

      type: "order_shipping_update",

      title: "Cập nhật vận chuyển",

      message:
        shippingNote?.trim() ||
        `Thông tin giao đơn "${
          book?.title || "Không xác định"
        }" vừa được cập nhật.`,

      relatedId: order._id,
    });

    return res.status(200).json({
      message: "Cập nhật vận chuyển thành công!",

      order,
    });
  } catch (error) {
    console.error("Lỗi updateShipping:", error);

    return res.status(500).json({
      message: "Lỗi server khi cập nhật vận chuyển",

      error: error.message,
    });
  }
};

// ======================================================
// 6. ADMIN XÁC NHẬN ĐÃ GIAO
// shipping → delivered
// ======================================================
exports.deliverOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const sellerId = req.user.userId || req.user._id;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng",
      });
    }

    if (order.sellerId.toString() !== sellerId.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền xác nhận giao hàng",
      });
    }

    if (order.status !== "shipping") {
      return res.status(400).json({
        message: "Chỉ đơn đang giao mới có thể xác nhận đã giao.",
      });
    }

    const now = new Date();

    // ==================================================
    // DELIVERED
    // ==================================================
    order.status = "delivered";

    order.deliveredAt = now;

    order.shippingNote =
      "Đơn hàng đã được giao. Đang chờ người mua xác nhận đã nhận.";

    order.statusHistory.push({
      status: "delivered",

      note: "Đơn hàng đã được giao đến người nhận.",

      updatedAt: now,
    });

    await order.save();

    // ==================================================
    // SHIPPING TRACKING: DELIVERED
    // ==================================================
    await createShippingTrackingSafe({
      orderId: order._id,

      status: "delivered",

      title: "Đã giao hàng",

      note: "Đơn hàng đã được giao đến người nhận.",

      shippingProvider: order.shippingProvider,

      trackingCode: order.trackingCode,

      updatedBy: sellerId,
    });

    const book = await Book.findById(order.bookId).select("title");

    await sendSafeNotification(req, {
      receiverId: order.buyerId,

      senderId: sellerId,

      type: "order_delivered",

      title: "Đơn hàng đã được giao",

      message: `Đơn sách "${
        book?.title || "Không xác định"
      }" đã được giao. Vui lòng xác nhận khi bạn đã nhận được sách.`,

      relatedId: order._id,
    });

    return res.status(200).json({
      message: "Đã xác nhận giao hàng!",

      order,
    });
  } catch (error) {
    console.error("Lỗi deliverOrder:", error);

    return res.status(500).json({
      message: "Lỗi server khi xác nhận giao hàng",

      error: error.message,
    });
  }
};

// ======================================================
// 7. USER XÁC NHẬN ĐÃ NHẬN
// delivered → completed
// ======================================================
exports.completeOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const buyerId = req.user.userId || req.user._id;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng",
      });
    }

    // ==================================================
    // CHỈ BUYER ĐƯỢC XÁC NHẬN
    // ==================================================
    if (order.buyerId.toString() !== buyerId.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền xác nhận đơn hàng này",
      });
    }

    if (order.status !== "delivered") {
      return res.status(400).json({
        message: "Chỉ đơn đã giao mới có thể xác nhận hoàn thành.",
      });
    }

    const now = new Date();

    // ==================================================
    // COMPLETED
    // ==================================================
    order.status = "completed";

    order.completedAt = now;

    order.shippingNote = "Người mua đã xác nhận nhận được sách.";

    order.statusHistory.push({
      status: "completed",

      note: "Người mua đã xác nhận nhận được sách.",

      updatedAt: now,
    });

    await order.save();

    // ==================================================
    // SHIPPING TRACKING: COMPLETED
    // ==================================================
    await createShippingTrackingSafe({
      orderId: order._id,

      status: "completed",

      title: "Đơn hàng hoàn thành",

      note: "Người mua đã xác nhận nhận được sách.",

      shippingProvider: order.shippingProvider,

      trackingCode: order.trackingCode,

      updatedBy: buyerId,
    });

    const book = await Book.findById(order.bookId).select("title");

    // ==================================================
    // THÔNG BÁO ADMIN
    // ==================================================
    await sendSafeNotification(req, {
      receiverId: order.sellerId,

      senderId: buyerId,

      type: "order_completed",

      title: "Đơn hàng đã hoàn thành",

      message: `Người mua đã xác nhận nhận được sách "${
        book?.title || "Không xác định"
      }".`,

      relatedId: order._id,
    });

    // ==================================================
    // ADMIN DASHBOARD
    // ==================================================
    emitAdminActivity(req, {
      type: "order_completed",

      message: `✅ Giao dịch "${
        book?.title || "Không xác định"
      }" đã hoàn thành`,

      amount: order.totalPrice,
    });

    return res.status(200).json({
      message: "Xác nhận nhận hàng thành công! Bạn có thể đánh giá người bán.",

      order,
    });
  } catch (error) {
    console.error("Lỗi completeOrder:", error);

    return res.status(500).json({
      message: "Lỗi server khi hoàn thành đơn hàng",

      error: error.message,
    });
  }
};

// ======================================================
// 8. HỦY / TỪ CHỐI ĐƠN
// Chỉ pending mới được hủy
// ======================================================
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = req.user.userId || req.user._id;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng",
      });
    }

    const isBuyer = order.buyerId.toString() === userId.toString();

    const isSeller = order.sellerId.toString() === userId.toString();

    // ==================================================
    // KIỂM TRA QUYỀN
    // ==================================================
    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        message: "Bạn không có quyền hủy đơn hàng này",
      });
    }

    // ==================================================
    // CHỈ PENDING MỚI HỦY
    // ==================================================
    if (order.status !== "pending") {
      return res.status(400).json({
        message: "Chỉ có thể hủy đơn đang chờ xác nhận",
      });
    }

    const now = new Date();

    // ==================================================
    // CANCELLED
    // ==================================================
    order.status = "cancelled";

    order.cancelledAt = now;

    order.statusHistory.push({
      status: "cancelled",

      note: isSeller
        ? "Admin đã từ chối đơn hàng."
        : "Người mua đã hủy đơn hàng.",

      updatedAt: now,
    });

    await order.save();

    // ==================================================
    // SHIPPING TRACKING: CANCELLED
    // ==================================================
    await createShippingTrackingSafe({
      orderId: order._id,

      status: "cancelled",

      title: "Đơn hàng đã bị hủy",

      note: isSeller
        ? "Admin đã từ chối đơn hàng."
        : "Người mua đã hủy đơn hàng.",

      updatedBy: userId,
    });

    const receiverId = isBuyer ? order.sellerId : order.buyerId;

    // ==================================================
    // HOÀN LẠI KHO
    // ==================================================
    const book = await Book.findById(order.bookId);

    if (book) {
      book.quantity = (book.quantity || 0) + (order.quantity || 1);

      if (book.status === "sold" && book.quantity > 0) {
        book.status = "available";
      }

      await book.save();
    }

    // ==================================================
    // THÔNG BÁO
    // ==================================================
    await sendSafeNotification(req, {
      receiverId,

      senderId: userId,

      type: "order_canceled",

      title: "Đơn hàng đã bị hủy",

      message: `Đơn đặt mua sách "${
        book?.title || "Không xác định"
      }" đã bị hủy.`,

      relatedId: order._id,
    });

    // ==================================================
    // ADMIN ACTIVITY
    // ==================================================
    emitAdminActivity(req, {
      type: "order_cancelled",

      message: `❌ Đơn "${book?.title || "Không xác định"}" đã bị hủy`,

      amount: 0,
    });

    return res.status(200).json({
      message: "Đã hủy đơn hàng thành công!",

      order,
    });
  } catch (error) {
    console.error("Lỗi cancelOrder:", error);

    return res.status(500).json({
      message: "Lỗi server khi hủy đơn hàng",

      error: error.message,
    });
  }
};

// ======================================================
// 9. LỊCH SỬ ĐƠN USER ĐÃ MUA
// ======================================================
exports.getBuyHistory = async (req, res) => {
  try {
    const buyerId = req.user.userId || req.user._id;

    const orders = await Order.find({
      buyerId,
    })
      .populate("bookId", "title images price status")
      .populate("sellerId", "fullName university avatar phoneNumber")
      .sort({
        createdAt: -1,
      })
      .lean();

    const orderIds = orders.map((order) => order._id);

    let reviewedOrderIds = new Set();

    // ==================================================
    // KIỂM TRA ĐƠN ĐÃ REVIEW CHƯA
    // ==================================================
    if (orderIds.length > 0) {
      const reviews = await Review.find({
        orderId: {
          $in: orderIds,
        },
      })
        .select("orderId")
        .lean();

      reviewedOrderIds = new Set(
        reviews.map((review) => String(review.orderId)),
      );
    }

    const result = orders.map((order) => ({
      ...order,

      hasReview: reviewedOrderIds.has(String(order._id)),
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi getBuyHistory:", error);

    return res.status(500).json({
      message: "Lỗi server khi lấy lịch sử mua hàng",

      error: error.message,
    });
  }
};

// ======================================================
// 10. DANH SÁCH ĐƠN ADMIN ĐANG BÁN
// ======================================================
exports.getSellOrders = async (req, res) => {
  try {
    const sellerId = req.user.userId || req.user._id;

    const orders = await Order.find({
      sellerId,
    })
      .populate("bookId", "title images price status")
      .populate("buyerId", "fullName university phoneNumber avatar")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json(orders);
  } catch (error) {
    console.error("Lỗi getSellOrders:", error);

    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách đơn hàng",

      error: error.message,
    });
  }
};
// ======================================================
// 11. LẤY LỊCH SỬ VẬN CHUYỂN CỦA MỘT ĐƠN HÀNG
// GET /api/orders/:id/tracking
// ======================================================
exports.getOrderTracking = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = req.user.userId || req.user._id;

    // ==================================================
    // KIỂM TRA ORDER
    // ==================================================
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng",
      });
    }

    // ==================================================
    // CHỈ BUYER HOẶC SELLER/ADMIN CỦA ĐƠN ĐƯỢC XEM
    // ==================================================
    const isBuyer = order.buyerId.toString() === userId.toString();

    const isSeller = order.sellerId.toString() === userId.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        message: "Bạn không có quyền xem lịch sử vận chuyển của đơn hàng này",
      });
    }

    // ==================================================
    // LẤY TIMELINE
    // ==================================================
    const tracking = await ShippingTracking.find({
      orderId: id,
    })
      .populate("updatedBy", "fullName role avatar")
      .sort({
        createdAt: 1,
      });

    return res.status(200).json({
      orderId: order._id,

      currentStatus: order.status,

      shippingProvider: order.shippingProvider,

      trackingCode: order.trackingCode,

      estimatedDeliveryDate: order.estimatedDeliveryDate,

      shippingNote: order.shippingNote,

      tracking,
    });
  } catch (error) {
    console.error("Lỗi getOrderTracking:", error);

    return res.status(500).json({
      message: "Lỗi server khi lấy lịch sử vận chuyển",

      error: error.message,
    });
  }
};
