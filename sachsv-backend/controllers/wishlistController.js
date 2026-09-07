const Wishlist = require("../models/Wishlist");
const respondServerError = require("../utils/respondServerError");

// 1. Thêm vào wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { bookId } = req.body;
    const userId = req.user.userId;

    const existing = await Wishlist.findOne({ userId, bookId });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Sách đã có trong danh sách yêu thích" });
    }

    await Wishlist.create({ userId, bookId });
    res.status(201).json({ message: "Đã thêm vào yêu thích!" });
  } catch (error) {
    respondServerError(res, error, "Lỗi server");
  }
};

// 2. Xem danh sách yêu thích
exports.getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.find({ userId: req.user.userId })
      .populate({
        path: "bookId",
        populate: { path: "sellerId", select: "fullName university" },
      })
      .sort({ createdAt: -1 });

    res.status(200).json(wishlist);
  } catch (error) {
    respondServerError(res, error, "Lỗi server");
  }
};

// 3. Xóa khỏi wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    await Wishlist.findOneAndDelete({
      userId: req.user.userId,
      bookId: req.params.bookId,
    });
    res.status(200).json({ message: "Đã xóa khỏi yêu thích!" });
  } catch (error) {
    respondServerError(res, error, "Lỗi server");
  }
};
