const Report = require("../models/Report");

// ======================================================
// NGƯỜI DÙNG GỬI TỐ CÁO
// ======================================================
exports.createReport = async (req, res) => {
  try {
    const { targetId, targetType, reason, description } = req.body;

    if (!targetId || !targetType || !reason?.trim()) {
      return res.status(400).json({
        message: "Vui lòng cung cấp đối tượng và lý do tố cáo.",
      });
    }

    const newReport = await Report.create({
      reporterId: req.user.userId,
      targetId,
      targetType,
      reason: reason.trim(),
      description: description?.trim() || "",
      status: "pending",
    });

    try {
      const io = req.app.get("io");

      io.to("admin_room").emit("admin_activity", {
        type: "report_created",
        message: `🚩 Có tố cáo mới (${
          targetType === "book" ? "sách" : "người dùng"
        })`,
        amount: 0,
        at: new Date(),
      });
    } catch (broadcastError) {
      console.log(
        "Không thể phát sự kiện admin_activity:",
        broadcastError.message,
      );
    }

    return res.status(201).json({
      message: "Đã gửi tố cáo thành công!",
      report: newReport,
    });
  } catch (error) {
    console.error("Lỗi tạo tố cáo:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// ======================================================
// ADMIN XEM DANH SÁCH TỐ CÁO
// ======================================================
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("reporterId", "fullName email")
      .sort({ createdAt: -1 });

    return res.status(200).json(reports);
  } catch (error) {
    console.error("Lỗi lấy danh sách tố cáo:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};
