const mongoose = require("mongoose");

// ======================================================
// ADDRESS
// Lưu các địa chỉ nhận hàng của User
// ======================================================
const addressSchema = new mongoose.Schema(
  {
    // ==================================================
    // CHỦ SỞ HỮU ĐỊA CHỈ
    // ==================================================
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ==================================================
    // TÊN GỢI NHỚ
    // Ví dụ: Nhà, Ký túc xá, Nhà bố mẹ...
    // ==================================================
    label: {
      type: String,
      trim: true,
      default: "Nhà",
      maxlength: 50,
    },

    // ==================================================
    // NGƯỜI NHẬN
    // ==================================================
    receiverName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // ==================================================
    // SỐ ĐIỆN THOẠI
    // ==================================================
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },

    // ==================================================
    // SỐ NHÀ / ĐƯỜNG / KHÓM / ẤP
    // ==================================================
    addressLine: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    // ==================================================
    // PHƯỜNG / XÃ
    // ==================================================
    ward: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // ==================================================
    // TỈNH / THÀNH PHỐ
    // ==================================================
    province: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // ==================================================
    // GHI CHÚ
    // ==================================================
    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },

    // ==================================================
    // ĐỊA CHỈ MẶC ĐỊNH
    // ==================================================
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// ======================================================
// USER + THỜI GIAN TẠO
// ======================================================
addressSchema.index({
  userId: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Address", addressSchema);
