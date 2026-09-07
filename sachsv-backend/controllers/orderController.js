const Order = require("../models/Order");
const Review = require("../models/Review");
const Book = require("../models/Book");
const User = require("../models/User");
const ShippingTracking = require("../models/ShippingTracking");

const sendNotification = require("../utils/sendNotification");
const { sendOrderAcceptedEmail } = require("../config/email");
const respondServerError = require("../utils/respondServerError");
const { buildVietQrUrl, buildPaymentContent } = require("../utils/buildVietQrUrl");

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
// TÓM TẮT DANH SÁCH SÁCH TRONG ĐƠN — DÙNG CHO MESSAGE THÔNG BÁO
// ------------------------------------------------------
// order.items đã lưu sẵn "title" (snapshot lúc đặt) nên không cần
// query lại Book mỗi lần gửi thông báo như trước đây.
// ======================================================
const summarizeOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return "sách trong đơn";
  }

  if (items.length === 1) {
    return `"${items[0].title}"`;
  }

  return `${items.length} loại sách`;
};

const totalQuantity = (items) =>
  (items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

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
// ------------------------------------------------------
// ĐÃ SỬA: trước đây 1 đơn chỉ chứa đúng 1 bookId/price/quantity.
// Giờ nhận items[] (nhiều sách khác nhau) — dùng chung cho cả luồng
// "Thanh toán giỏ hàng" (nhiều item) và "Mua ngay" ở trang chi tiết
// sách (mảng chỉ có 1 item), không cần API riêng cho 2 luồng.
// ======================================================
exports.createOrder = async (req, res) => {
  const reservedBooks = [];

  try {
    const { items, shippingAddress } = req.body || {};

    const buyerId = req.user.userId || req.user._id;

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
    // GỘP CÁC ITEM TRÙNG bookId (client lỡ gửi 2 lần cùng 1 sách)
    // ==================================================
    const quantityByBookId = new Map();

    for (const rawItem of items) {
      const bookId = String(rawItem.bookId);
      const quantity = Number(rawItem.quantity) || 1;

      quantityByBookId.set(bookId, (quantityByBookId.get(bookId) || 0) + quantity);
    }

    const requestedItems = Array.from(quantityByBookId.entries()).map(
      ([bookId, quantity]) => ({ bookId, quantity }),
    );

    // ==================================================
    // KIỂM TRA + TRỪ KHO TỪNG SÁCH MỘT
    // Dừng ngay khi 1 sách lỗi, rồi hoàn lại kho cho những sách đã
    // trừ thành công trước đó trong CHÍNH request này (rollback).
    // ==================================================
    let sellerId = null;
    let failMessage = null;

    for (const item of requestedItems) {
      const book = await Book.findById(item.bookId);

      if (!book) {
        failMessage = "Không tìm thấy sách";
        break;
      }

      if (!book.sellerId) {
        failMessage = `Sách "${book.title}" chưa có thông tin người bán`;
        break;
      }

      if (book.sellerId.toString() === buyerId.toString()) {
        failMessage = `Bạn không thể tự mua sách "${book.title}" của chính mình`;
        break;
      }

      // Hệ thống hiện chỉ có 1 shop/admin duy nhất — mọi sách trong
      // đơn luôn phải cùng 1 người bán.
      if (sellerId && sellerId.toString() !== book.sellerId.toString()) {
        failMessage = "Các sách trong đơn phải thuộc cùng một người bán";
        break;
      }

      sellerId = book.sellerId;

      if (book.status !== "available") {
        let message = `Sách "${book.title}" hiện không thể đặt mua`;

        if (book.status === "sold") {
          message = `Sách "${book.title}" đã được bán hết`;
        }

        if (book.status === "hidden") {
          message = `Sách "${book.title}" hiện đang bị ẩn`;
        }

        failMessage = message;
        break;
      }

      // Không cho đặt trùng khi đang có đơn hoạt động cho cùng sách này
      const existingOrder = await Order.findOne({
        buyerId,
        "items.bookId": item.bookId,
        status: {
          $in: ["pending", "confirmed", "preparing", "shipping", "delivered"],
        },
      });

      if (existingOrder) {
        failMessage = `Bạn đã đặt mua sách "${book.title}" rồi.`;
        break;
      }

      const reserved = await Book.findOneAndUpdate(
        {
          _id: item.bookId,
          status: "available",
          quantity: { $gte: item.quantity },
        },
        {
          $inc: { quantity: -item.quantity },
        },
        {
          new: true,
        },
      );

      if (!reserved) {
        failMessage = `Sách "${book.title}" chỉ còn lại không đủ ${item.quantity} cuốn. Vui lòng chọn số lượng ít hơn.`;
        break;
      }

      if (reserved.quantity <= 0 && reserved.status !== "sold") {
        reserved.status = "sold";

        await reserved.save();
      }

      reservedBooks.push({
        bookId: book._id,
        title: book.title,
        price: book.price,
        quantity: item.quantity,
      });
    }

    if (failMessage) {
      // ROLLBACK: hoàn lại kho cho những sách đã trừ thành công
      for (const reservedItem of reservedBooks) {
        const restored = await Book.findByIdAndUpdate(
          reservedItem.bookId,
          { $inc: { quantity: reservedItem.quantity } },
          { new: true },
        );

        if (restored && restored.status === "sold" && restored.quantity > 0) {
          restored.status = "available";

          await restored.save();
        }
      }

      return res.status(400).json({
        message: failMessage,
      });
    }

    // ==================================================
    // TẠO ORDER
    // ==================================================
    const orderItems = reservedBooks.map((item) => ({
      bookId: item.bookId,
      title: item.title,
      price: item.price,
      quantity: item.quantity,
    }));

    const orderTotalPrice = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const now = new Date();

    const newOrder = await Order.create({
      buyerId,

      sellerId,

      items: orderItems,

      totalPrice: orderTotalPrice,

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
      receiverId: sellerId,

      senderId: buyerId,

      type: "order_created",

      title: "Có đơn đặt mua mới",

      message: `${summarizeOrderItems(orderItems)} vừa có người đặt mua.`,

      relatedId: newOrder._id,
    });

    // ==================================================
    // REALTIME ADMIN DASHBOARD
    // ==================================================
    emitAdminActivity(req, {
      type: "order_created",

      message: `🛒 Đơn mua mới: ${summarizeOrderItems(orderItems)} (SL: ${totalQuantity(
        orderItems,
      )})`,

      amount: newOrder.totalPrice,
    });

    return res.status(201).json({
      message: "Đặt mua thành công! Đang chờ Admin xác nhận.",

      order: newOrder,
    });
  } catch (error) {
    // Nếu lỗi xảy ra SAU khi đã trừ kho (vd lỗi lúc tạo Order), vẫn
    // phải hoàn kho để không mất hàng oan.
    for (const reservedItem of reservedBooks) {
      await Book.findByIdAndUpdate(reservedItem.bookId, {
        $inc: { quantity: reservedItem.quantity },
      }).catch(() => {});
    }

    return respondServerError(res, error, "Lỗi server khi tạo đơn hàng");
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

      message: `Đơn mua sách ${summarizeOrderItems(order.items)} của bạn đã được Admin xác nhận.`,

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

          bookTitle:
            order.items.length === 1
              ? order.items[0].title
              : `${order.items.length} loại sách`,

          price: order.totalPrice,

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

      message: `✅ Đã xác nhận đơn ${summarizeOrderItems(order.items)}`,

      amount: 0,
    });

    return res.status(200).json({
      message: "Đã xác nhận đơn hàng!",

      order,

      emailSent,
    });
  } catch (error) {
    return respondServerError(res, error, "Lỗi server khi xác nhận đơn hàng");
  }
};

// ======================================================
// 2.5. ADMIN XÁC NHẬN ĐÃ NHẬN THANH TOÁN
// confirmed, chưa paid -> paid (không đổi order.status)
// ------------------------------------------------------
// ĐÃ THÊM: xác nhận bằng tay sau khi Admin tự kiểm tra tài khoản
// ngân hàng thấy tiền đã về — không có xác minh tự động (không dùng
// webhook/API tra soát ngân hàng).
// ======================================================
exports.confirmPayment = async (req, res) => {
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
        message: "Chỉ xác nhận thanh toán cho đơn đã được duyệt (confirmed).",
      });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        message: "Đơn hàng này đã được xác nhận thanh toán trước đó.",
      });
    }

    order.paymentStatus = "paid";

    order.paymentConfirmedAt = new Date();

    await order.save();

    await sendSafeNotification(req, {
      receiverId: order.buyerId,

      senderId: sellerId,

      type: "payment_confirmed",

      title: "Đã xác nhận thanh toán",

      message: `Đã xác nhận thanh toán đơn ${summarizeOrderItems(order.items)}, đang chuẩn bị hàng cho bạn.`,

      relatedId: order._id,
    });

    return res.status(200).json({
      message: "Đã xác nhận thanh toán đơn hàng!",

      order,
    });
  } catch (error) {
    return respondServerError(
      res,
      error,
      "Lỗi server khi xác nhận thanh toán",
    );
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

    // ĐÃ THÊM: bắt buộc thanh toán QR xong mới được chuẩn bị hàng —
    // "!== paid" để đơn cũ (chưa có field paymentStatus) cũng bị chặn.
    if (order.paymentStatus !== "paid") {
      return res.status(400).json({
        message: "Đơn hàng chưa được thanh toán, không thể chuyển sang chuẩn bị hàng.",
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

    await sendSafeNotification(req, {
      receiverId: order.buyerId,

      senderId: sellerId,

      type: "order_preparing",

      title: "Đơn hàng đang được chuẩn bị",

      message: `Đơn sách ${summarizeOrderItems(order.items)} đang được chuẩn bị để giao cho bạn.`,

      relatedId: order._id,
    });

    return res.status(200).json({
      message: "Đã chuyển đơn sang trạng thái đang chuẩn bị.",

      order,
    });
  } catch (error) {
    return respondServerError(res, error, "Lỗi server khi chuẩn bị đơn hàng");
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

    await sendSafeNotification(req, {
      receiverId: order.buyerId,

      senderId: sellerId,

      type: "order_shipping",

      title: "Đơn hàng đang được giao",

      message: `Đơn sách ${summarizeOrderItems(order.items)} đã bắt đầu được giao.`,

      relatedId: order._id,
    });

    return res.status(200).json({
      message: "Đã bắt đầu giao hàng!",

      order,
    });
  } catch (error) {
    return respondServerError(res, error, "Lỗi server khi bắt đầu giao hàng");
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
        `Thông tin giao đơn ${summarizeOrderItems(order.items)} vừa được cập nhật.`,

      relatedId: order._id,
    });

    return res.status(200).json({
      message: "Cập nhật vận chuyển thành công!",

      order,
    });
  } catch (error) {
    return respondServerError(res, error, "Lỗi server khi cập nhật vận chuyển");
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

    await sendSafeNotification(req, {
      receiverId: order.buyerId,

      senderId: sellerId,

      type: "order_delivered",

      title: "Đơn hàng đã được giao",

      message: `Đơn sách ${summarizeOrderItems(order.items)} đã được giao. Vui lòng xác nhận khi bạn đã nhận được sách.`,

      relatedId: order._id,
    });

    return res.status(200).json({
      message: "Đã xác nhận giao hàng!",

      order,
    });
  } catch (error) {
    return respondServerError(res, error, "Lỗi server khi xác nhận giao hàng");
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

    // ==================================================
    // THÔNG BÁO ADMIN
    // ==================================================
    await sendSafeNotification(req, {
      receiverId: order.sellerId,

      senderId: buyerId,

      type: "order_completed",

      title: "Đơn hàng đã hoàn thành",

      message: `Người mua đã xác nhận nhận được sách ${summarizeOrderItems(order.items)}.`,

      relatedId: order._id,
    });

    // ==================================================
    // ADMIN DASHBOARD
    // ==================================================
    emitAdminActivity(req, {
      type: "order_completed",

      message: `✅ Giao dịch ${summarizeOrderItems(order.items)} đã hoàn thành`,

      amount: order.totalPrice,
    });

    return res.status(200).json({
      message: "Xác nhận nhận hàng thành công! Bạn có thể đánh giá người bán.",

      order,
    });
  } catch (error) {
    return respondServerError(res, error, "Lỗi server khi hoàn thành đơn hàng");
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
    // HOÀN LẠI KHO — cho TỪNG sách trong đơn
    // ==================================================
    for (const item of order.items) {
      const book = await Book.findById(item.bookId);

      if (book) {
        book.quantity = (book.quantity || 0) + (item.quantity || 1);

        if (book.status === "sold" && book.quantity > 0) {
          book.status = "available";
        }

        await book.save();
      }
    }

    // ==================================================
    // THÔNG BÁO
    // ==================================================
    await sendSafeNotification(req, {
      receiverId,

      senderId: userId,

      type: "order_canceled",

      title: "Đơn hàng đã bị hủy",

      message: `Đơn đặt mua sách ${summarizeOrderItems(order.items)} đã bị hủy.`,

      relatedId: order._id,
    });

    // ==================================================
    // ADMIN ACTIVITY
    // ==================================================
    emitAdminActivity(req, {
      type: "order_cancelled",

      message: `❌ Đơn ${summarizeOrderItems(order.items)} đã bị hủy`,

      amount: 0,
    });

    return res.status(200).json({
      message: "Đã hủy đơn hàng thành công!",

      order,
    });
  } catch (error) {
    return respondServerError(res, error, "Lỗi server khi hủy đơn hàng");
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
      .populate("items.bookId", "title images price status")
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

    // ==================================================
    // GẮN THÔNG TIN QR THANH TOÁN
    // ------------------------------------------------------
    // ĐÃ THÊM: chỉ đơn đã được Admin duyệt (confirmed) và chưa thanh
    // toán mới cần hiện QR — "!== paid" để đơn cũ (không có field
    // paymentStatus) cũng tự động rơi vào diện "chưa thanh toán".
    // ==================================================
    const result = orders.map((order) => {
      const needsPayment =
        order.status === "confirmed" && order.paymentStatus !== "paid";

      const paymentContent = needsPayment
        ? buildPaymentContent(order._id)
        : undefined;

      return {
        ...order,

        hasReview: reviewedOrderIds.has(String(order._id)),

        ...(needsPayment && {
          paymentQrUrl: buildVietQrUrl(order.totalPrice, paymentContent),
          paymentContent,
        }),
      };
    });

    return res.status(200).json(result);
  } catch (error) {
    return respondServerError(
      res,
      error,
      "Lỗi server khi lấy lịch sử mua hàng",
    );
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
      .populate("items.bookId", "title images price status")
      .populate("buyerId", "fullName university phoneNumber avatar")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json(orders);
  } catch (error) {
    return respondServerError(
      res,
      error,
      "Lỗi server khi lấy danh sách đơn hàng",
    );
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
    return respondServerError(
      res,
      error,
      "Lỗi server khi lấy lịch sử vận chuyển",
    );
  }
};
