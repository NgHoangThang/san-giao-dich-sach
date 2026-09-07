const Cart = require("../models/Cart");
const Book = require("../models/Book");
const respondServerError = require("../utils/respondServerError");

// ======================================================
// TIỆN ÍCH: LẤY HOẶC TẠO GIỎ HÀNG CỦA USER
// ======================================================
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = await Cart.create({ userId, items: [] });
  }

  return cart;
};

// ======================================================
// 1. XEM GIỎ HÀNG
// GET /api/cart
// ======================================================
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const cart = await getOrCreateCart(userId);

    // Populate thông tin sách HIỆN TẠI (giá/tồn kho/trạng thái mới nhất)
    // — giỏ hàng không lưu snapshot giá nên luôn phải lấy real-time.
    await cart.populate({
      path: "items.bookId",
      select: "title images price originalPrice status quantity sellerId",
    });

    const items = cart.items
      .filter((item) => item.bookId) // sách đã bị xóa hẳn khỏi DB -> loại khỏi giỏ khi hiển thị
      .map((item) => {
        const book = item.bookId;

        const unavailable =
          book.status !== "available" || book.quantity < item.quantity;

        return {
          book,
          quantity: item.quantity,
          unavailable,
        };
      });

    const subtotal = items.reduce(
      (sum, item) =>
        item.unavailable ? sum : sum + item.book.price * item.quantity,
      0,
    );

    return res.status(200).json({
      items,
      subtotal,
    });
  } catch (error) {
    return respondServerError(res, error, "Lỗi server khi lấy giỏ hàng");
  }
};

// ======================================================
// 2. THÊM SÁCH VÀO GIỎ
// POST /api/cart
// ======================================================
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const { bookId, quantity } = req.body;

    const addQuantity = quantity ? Number(quantity) : 1;

    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({
        message: "Không tìm thấy sách",
      });
    }

    if (book.status !== "available") {
      return res.status(400).json({
        message: "Sách này hiện không thể thêm vào giỏ hàng",
      });
    }

    // ==================================================
    // KHÔNG CHO TỰ THÊM SÁCH CỦA CHÍNH MÌNH
    // Giữ nhất quán với quy tắc "không tự mua sách của
    // chính mình" đang áp dụng khi tạo Order.
    // ==================================================
    if (book.sellerId.toString() === userId.toString()) {
      return res.status(400).json({
        message: "Bạn không thể tự mua sách của chính mình",
      });
    }

    const cart = await getOrCreateCart(userId);

    const existingItem = cart.items.find(
      (item) => item.bookId.toString() === bookId,
    );

    if (existingItem) {
      existingItem.quantity += addQuantity;
    } else {
      cart.items.push({ bookId, quantity: addQuantity });
    }

    await cart.save();

    return res.status(200).json({
      message: "Đã thêm vào giỏ hàng",
      cart,
    });
  } catch (error) {
    return respondServerError(
      res,
      error,
      "Lỗi server khi thêm vào giỏ hàng",
    );
  }
};

// ======================================================
// 3. SỬA SỐ LƯỢNG 1 SÁCH TRONG GIỎ
// PATCH /api/cart/:bookId
// ======================================================
exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const { bookId } = req.params;

    const { quantity } = req.body;

    const cart = await getOrCreateCart(userId);

    const item = cart.items.find(
      (cartItem) => cartItem.bookId.toString() === bookId,
    );

    if (!item) {
      return res.status(404).json({
        message: "Sách không có trong giỏ hàng",
      });
    }

    item.quantity = Number(quantity);

    await cart.save();

    return res.status(200).json({
      message: "Đã cập nhật số lượng",
      cart,
    });
  } catch (error) {
    return respondServerError(
      res,
      error,
      "Lỗi server khi cập nhật giỏ hàng",
    );
  }
};

// ======================================================
// 4. XÓA 1 SÁCH KHỎI GIỎ
// DELETE /api/cart/:bookId
// ======================================================
exports.removeCartItem = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const { bookId } = req.params;

    const cart = await getOrCreateCart(userId);

    cart.items = cart.items.filter(
      (item) => item.bookId.toString() !== bookId,
    );

    await cart.save();

    return res.status(200).json({
      message: "Đã xóa khỏi giỏ hàng",
      cart,
    });
  } catch (error) {
    return respondServerError(
      res,
      error,
      "Lỗi server khi xóa khỏi giỏ hàng",
    );
  }
};

// ======================================================
// 5. XÓA SẠCH GIỎ HÀNG
// DELETE /api/cart
// ------------------------------------------------------
// Dùng sau khi checkout thành công (Bước 3 của roadmap Cart/Order).
// ======================================================
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [] } },
      { upsert: true },
    );

    return res.status(200).json({
      message: "Đã xóa sạch giỏ hàng",
    });
  } catch (error) {
    return respondServerError(res, error, "Lỗi server khi xóa giỏ hàng");
  }
};
