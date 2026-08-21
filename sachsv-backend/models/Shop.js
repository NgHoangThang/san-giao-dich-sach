const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    // Admin quản lý shop
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Tên cửa hàng
    shopName: {
      type: String,
      required: true,
      trim: true,
      default: "Sách SV",
      maxlength: 150,
    },

    // Mô tả cửa hàng
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    // Số điện thoại liên hệ
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
    },

    // Email cửa hàng
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    // Số nhà / đường / khóm / ấp
    addressLine: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },

    // Phường / Xã
    ward: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    // Tỉnh / Thành phố
    province: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    // Giờ mở cửa
    openingHours: {
      type: String,
      trim: true,
      default: "07:30 - 21:00",
      maxlength: 100,
    },

    // Cho phép khách đến mua trực tiếp
    directPurchaseEnabled: {
      type: Boolean,
      default: true,
    },

    // Shop có được hiển thị public hay không
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Shop", shopSchema);
