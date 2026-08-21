const User = require("../models/User");
const Book = require("../models/Book");
const Order = require("../models/Order");
const Report = require("../models/Report");
const Review = require("../models/Review");

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
            $sum: "$price",
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
            $sum: "$price",
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
    console.error("Lỗi lấy thống kê Dashboard:", error);

    return res.status(500).json({
      message: "Lỗi server khi lấy thống kê Dashboard.",
      error: error.message,
    });
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
    console.error("Lỗi lấy danh sách người dùng:", error);

    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách người dùng.",
      error: error.message,
    });
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
    console.error("Lỗi khóa tài khoản:", error);

    return res.status(500).json({
      message: "Lỗi server khi khóa tài khoản.",
      error: error.message,
    });
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
    console.error("Lỗi mở khóa tài khoản:", error);

    return res.status(500).json({
      message: "Lỗi server khi mở khóa tài khoản.",
      error: error.message,
    });
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
    console.error("Lỗi Admin lấy danh sách sách:", error);

    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách sách.",
      error: error.message,
    });
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

    await Book.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Đã xóa vĩnh viễn cuốn sách vi phạm khỏi hệ thống!",
    });
  } catch (error) {
    console.error("Lỗi Admin xóa sách:", error);

    return res.status(500).json({
      message: "Lỗi server khi xóa sách.",
      error: error.message,
    });
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
      .populate({
        path: "orderId",
        select: "bookId buyerId sellerId price status createdAt",
        populate: {
          path: "bookId",
          select: "title author images price status",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(reviews);
  } catch (error) {
    console.error("Lỗi Admin lấy danh sách đánh giá:", error);

    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách đánh giá.",
      error: error.message,
    });
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
    console.error("Lỗi lấy danh sách tố cáo:", error);

    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách tố cáo.",
      error: error.message,
    });
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
    console.error("Lỗi cập nhật trạng thái tố cáo:", error);

    return res.status(500).json({
      message: "Lỗi server khi cập nhật trạng thái tố cáo.",
      error: error.message,
    });
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
    console.error("Lỗi xóa tố cáo:", error);

    return res.status(500).json({
      message: "Lỗi server khi xóa tố cáo.",
      error: error.message,
    });
  }
};
