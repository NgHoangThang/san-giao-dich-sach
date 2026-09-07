const Review = require("../models/Review");
const Order = require("../models/Order");
const sendNotification = require("../utils/sendNotification");
const respondServerError = require("../utils/respondServerError");

// 1. Viết đánh giá cho người bán
exports.createReview = async (req, res) => {
  try {
    const { orderId, rating, comment } = req.body;
    const reviewerId = req.user.userId;

    // Tìm và kiểm tra đơn hàng xem có đúng điều kiện không
    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    // Kiểm tra xem ông này có đúng là người mua trong đơn hàng không
    if (order.buyerId.toString() !== reviewerId) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền đánh giá đơn hàng này" });
    }

    // Đơn hàng phải hoàn thành thành công mới được đánh giá
    if (order.status !== "completed") {
      return res.status(400).json({
        message: "Chỉ được đánh giá sau khi giao dịch đã hoàn thành thành công",
      });
    }

    // Kiểm tra xem đã từng đánh giá đơn này chưa
    const existingReview = await Review.findOne({ orderId });
    if (existingReview) {
      return res
        .status(400)
        .json({ message: "Bạn đã đánh giá giao dịch này rồi" });
    }

    const newReview = new Review({
      orderId,
      reviewerId,
      revieweeId: order.sellerId,
      rating,
      comment,
    });

    await newReview.save();

    // Gửi thông báo real-time cho NGƯỜI BÁN
    const io = req.app.get("io");
    await sendNotification({
      io,
      receiverId: order.sellerId,
      senderId: reviewerId,
      type: "review_created",
      title: "Bạn có đánh giá mới",
      message: `Bạn vừa nhận được ${rating} sao từ một giao dịch.`,
      relatedId: newReview._id,
    });

    res
      .status(201)
      .json({ message: "Cảm ơn bạn đã để lại đánh giá!", review: newReview });
  } catch (error) {
    respondServerError(res, error, "Lỗi server");
  }
};

// 2. Lấy toàn bộ đánh giá của một người bán (Hiển thị công khai lên profile của họ)
exports.getSellerReviews = async (req, res) => {
  try {
    const { sellerId } = req.params;

    const reviews = await Review.find({ revieweeId: sellerId })
      .populate("reviewerId", "fullName avatar university")
      .sort({ createdAt: -1 });

    // Tính điểm trung bình cộng số sao của người bán này
    let averageRating = 0;
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
      averageRating = (sum / reviews.length).toFixed(1);
    }

    res.status(200).json({
      totalReviews: reviews.length,
      averageRating: parseFloat(averageRating),
      reviews,
    });
  } catch (error) {
    respondServerError(res, error, "Lỗi server");
  }
};
