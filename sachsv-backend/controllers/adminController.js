const User = require("../models/User");
const Book = require("../models/Book");
const Order = require("../models/Order");
const Report = require("../models/Report");
const Review = require("../models/Review");
const respondServerError = require("../utils/respondServerError");

// Dùng chung logic xóa sách an toàn với bookController.deleteBook,
// để không lặp lại lỗi 2 nơi xóa Book có 2 tiêu chuẩn an toàn khác
// nhau (deleteBookAdmin trước đây hard-delete vô điều kiện, có thể
// để lại Order/Conversation mồ côi).
const { deleteBookSafely } = require("./bookController");

// ======================================================
// 1. THỐNG KÊ DASHBOARD
// ======================================================
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBooks = await Book.countDocuments();
    const totalOrders = await Order.countDocuments();

    const completedOrders = await Order.countDocuments({
      status: "completed",
    });

    // ĐÃ SỬA: doanh thu trước đây cộng theo "$price" (đơn giá 1 cuốn),
    // bỏ qua quantity -> đơn mua nhiều hơn 1 cuốn bị tính thiếu doanh
    // thu. "totalPrice" trong Order đã là price * quantity nên mới
    // đúng là tổng tiền thật của đơn.
    // ĐÃ THÊM: một số Order cũ (tạo trước khi field totalPrice/quantity
    // tồn tại) không có totalPrice -> $sum bỏ qua, coi như 0, làm hụt
    // doanh thu của các đơn cũ đó. $ifNull rơi về "$price" (tương
    // đương totalPrice khi quantity = 1) cho tới khi các đơn này được
    // backfill totalPrice thật sự.
    const revenueAggregation = await Order.aggregate([
      {
        $match: {
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $ifNull: ["$totalPrice", "$price"],
            },
          },
        },
      },
    ]);

    const totalRevenue =
      revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;

    const monthlyStats = await Order.aggregate([
      {
        $match: {
          status: "completed",
        },
      },
      {
        $group: {
          _id: {
            month: {
              $month: "$createdAt",
            },
            year: {
              $year: "$createdAt",
            },
          },
          monthlyRevenue: {
            $sum: {
              $ifNull: ["$totalPrice", "$price"],
            },
          },
          orderCount: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    return res.status(200).json({
      totalUsers,
      totalBooks,
      totalOrders,
      completedOrders,
      totalRevenue,
      monthlyStats,
    });
  } catch (error) {
    return respondServerError(
      res,
      error,
      "Lỗi server khi lấy thống kê Dashboard.",
    );
  }
};

// ======================================================
// 2. ADMIN XEM DANH SÁCH NGƯỜI DÙNG
// ======================================================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    return res.status(200).json(users);
  } catch (error) {
    return respondServerError(
      res,
      error,
      "Lỗi server khi lấy danh sách người dùng.",
    );
  }
};

// ======================================================
// 3. ADMIN KHÓA TÀI KHOẢN
// ======================================================
exports.lockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "Không tìm thấy người dùng.",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        message: "Không thể khóa tài khoản Quản trị viên.",
      });
    }

    if (user.isLocked) {
      return res.status(400).json({
        message: "Tài khoản này đã bị khóa từ trước.",
      });
    }

    user.isLocked = true;
    await user.save();

    return res.status(200).json({
      message: `Đã khóa tài khoản của ${user.fullName} thành công!`,
      user: {
        _id: user._id,
        fullName: user.fullName,
        isLocked: user.isLocked,
      },
    });
  } catch (error) {
    return respondServerError(res, error, "Lỗi server khi khóa tài khoản.");
  }
};

// ======================================================
// 4. ADMIN MỞ KHÓA TÀI KHOẢN
// ======================================================
exports.unlockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "Không tìm thấy người dùng.",
      });
    }

    if (!user.isLocked) {
      return res.status(400).json({
        message: "Tài khoản này hiện không bị khóa.",
      });
    }

    user.isLocked = false;
    await user.save();

    return res.status(200).json({
      message: `Đã mở khóa tài khoản của ${user.fullName} thành công!`,
      user: {
        _id: user._id,
        fullName: user.fullName,
        isLocked: user.isLocked,
      },
    });
  } catch (error) {
    return respondServerError(res, error, "Lỗi server khi mở khóa tài khoản.");
  }
};

// ======================================================
// 5. ADMIN XEM TOÀN BỘ SÁCH
// ======================================================
exports.getAllBooksForAdmin = async (req, res) => {
  try {
    const books = await Book.find()
      .populate("sellerId", "fullName email")
      .sort({ createdAt: -1 });

    return res.status(200).json(books);
  } catch (error) {
    return respondServerError(res, error, "Lỗi server khi lấy danh sách sách.");
  }
};

// ======================================================
// 6. ADMIN XÓA SÁCH VI PHẠM
// ======================================================
exports.deleteBookAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({
        message: "Không tìm thấy cuốn sách này.",
      });
    }

    // ĐÃ SỬA: trước đây gọi thẳng Book.findByIdAndDelete() không
    // điều kiện, có thể xóa cả sách đang có Order/Conversation tham
    // chiếu -> để lại dữ liệu mồ côi. Giờ dùng chung tiêu chuẩn an
    // toàn với bookController.deleteBook: còn Order/Conversation thì
    // chỉ soft-delete (status = "deleted"), không hard-delete.
    const { hardDeleted, orderCount, conversationCount } =
      await deleteBookSafely(book);

    if (hardDeleted) {
      return res.status(200).json({
        message: "Đã xóa vĩnh viễn cuốn sách vi phạm khỏi hệ thống!",
        hardDeleted: true,
      });
    }

    return res.status(200).json({
      message:
        `Không thể xóa vĩnh viễn vì cuốn sách này đang có ${orderCount} ` +
        `đơn hàng và ${conversationCount} cuộc trò chuyện liên quan — ` +
        `đã chuyển sang trạng thái "deleted" (ẩn khỏi cửa hàng) để không ` +
        `làm hỏng lịch sử mua hàng của khách.`,
      hardDeleted: false,
    });
  } catch (error) {
    return respondServerError(res, error, "Lỗi server khi xóa sách.");
  }
};

// ======================================================
// 7. ADMIN XEM TOÀN BỘ ĐÁNH GIÁ
// ======================================================
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("reviewerId", "fullName email avatar university phoneNumber")
      .populate("revieweeId", "fullName email avatar university phoneNumber")
      // ĐÃ SỬA: Order giờ chứa nhiều sách qua items[] thay vì 1 bookId/
      // price duy nhất — populate đúng đường dẫn mới.
      .populate({
        path: "orderId",
        select: "items totalPrice buyerId sellerId status createdAt",
        populate: {
          path: "items.bookId",
          select: "title author images price status",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(reviews);
  } catch (error) {
    return respondServerError(
      res,
      error,
      "Lỗi server khi lấy danh sách đánh giá.",
    );
  }
};

// ======================================================
// 8. ADMIN XEM DANH SÁCH TỐ CÁO
// ======================================================
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("reporterId", "fullName email")
      .sort({ createdAt: -1 })
      .lean();

    const reportsWithTarget = await Promise.all(
      reports.map(async (report) => {
        let target = null;

        if (report.targetType === "book" && report.targetId) {
          target = await Book.findById(report.targetId)
            .select("title author images price status sellerId")
            .lean();
        }

        if (report.targetType === "user" && report.targetId) {
          target = await User.findById(report.targetId)
            .select("fullName email avatar university role isLocked")
            .lean();
        }

        return {
          ...report,
          target,
        };
      }),
    );

    return res.status(200).json(reportsWithTarget);
  } catch (error) {
    return respondServerError(
      res,
      error,
      "Lỗi server khi lấy danh sách tố cáo.",
    );
  }
};

// ======================================================
// 9. ADMIN CẬP NHẬT TRẠNG THÁI TỐ CÁO
// ======================================================
exports.updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["resolved", "dismissed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Trạng thái chỉ được là resolved hoặc dismissed.",
      });
    }

    const report = await Report.findByIdAndUpdate(
      id,
      {
        status,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!report) {
      return res.status(404).json({
        message: "Không tìm thấy đơn tố cáo.",
      });
    }

    return res.status(200).json({
      message:
        status === "resolved"
          ? "Đã xử lý tố cáo thành công."
          : "Đã bỏ qua tố cáo.",
      report,
    });
  } catch (error) {
    return respondServerError(
      res,
      error,
      "Lỗi server khi cập nhật trạng thái tố cáo.",
    );
  }
};

// ======================================================
// 10. ADMIN XÓA TỐ CÁO
// ======================================================
exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findByIdAndDelete(id);

    if (!report) {
      return res.status(404).json({
        message: "Không tìm thấy tố cáo.",
      });
    }

    return res.status(200).json({
      message: "Đã xóa tố cáo thành công.",
    });
  } catch (error) {
    return respondServerError(res, error, "Lỗi server khi xóa tố cáo.");
  }
};
