const Shop = require("../models/Shop");

// ======================================================
// 1. PUBLIC - LẤY THÔNG TIN SHOP
// GET /api/shop
// Ai cũng xem được
// ======================================================
exports.getPublicShop = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      isActive: true,
    })
      .populate("adminId", "fullName avatar")
      .sort({
        updatedAt: -1,
      });

    if (!shop) {
      return res.status(404).json({
        message: "Thông tin cửa hàng chưa được thiết lập",
      });
    }

    return res.status(200).json({
      shop,
    });
  } catch (error) {
    console.error("Lỗi getPublicShop:", error);

    return res.status(500).json({
      message: "Không thể lấy thông tin cửa hàng",
      error: error.message,
    });
  }
};

// ======================================================
// 2. ADMIN - LẤY THÔNG TIN SHOP CỦA ADMIN
// GET /api/shop/admin
// ======================================================
exports.getAdminShop = async (req, res) => {
  try {
    const adminId = req.user.userId || req.user._id;

    const shop = await Shop.findOne({
      adminId,
    });

    return res.status(200).json({
      shop,
    });
  } catch (error) {
    console.error("Lỗi getAdminShop:", error);

    return res.status(500).json({
      message: "Không thể lấy thông tin cửa hàng",
      error: error.message,
    });
  }
};

// ======================================================
// 3. ADMIN - TẠO HOẶC CẬP NHẬT SHOP
// PUT /api/shop/admin
// ======================================================
exports.saveShop = async (req, res) => {
  try {
    const adminId = req.user.userId || req.user._id;

    const {
      shopName,
      description,
      phoneNumber,
      email,
      addressLine,
      ward,
      province,
      openingHours,
      directPurchaseEnabled,
      isActive,
    } = req.body || {};

    // ==================================================
    // VALIDATE
    // ==================================================
    if (!shopName?.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập tên cửa hàng",
      });
    }

    if (!phoneNumber?.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập số điện thoại cửa hàng",
      });
    }

    if (!addressLine?.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập địa chỉ cửa hàng",
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
    // TÌM SHOP CỦA ADMIN
    // ==================================================
    let shop = await Shop.findOne({
      adminId,
    });

    // ==================================================
    // CHƯA CÓ → TẠO MỚI
    // ==================================================
    if (!shop) {
      shop = await Shop.create({
        adminId,

        shopName: shopName.trim(),

        description: description?.trim() || "",

        phoneNumber: phoneNumber.trim(),

        email: email?.trim() || "",

        addressLine: addressLine.trim(),

        ward: ward.trim(),

        province: province.trim(),

        openingHours: openingHours?.trim() || "07:30 - 21:00",

        directPurchaseEnabled: directPurchaseEnabled !== false,

        isActive: isActive !== false,
      });

      return res.status(201).json({
        message: "Tạo thông tin cửa hàng thành công",
        shop,
      });
    }

    // ==================================================
    // ĐÃ CÓ → UPDATE
    // ==================================================
    shop.shopName = shopName.trim();

    shop.description = description?.trim() || "";

    shop.phoneNumber = phoneNumber.trim();

    shop.email = email?.trim() || "";

    shop.addressLine = addressLine.trim();

    shop.ward = ward.trim();

    shop.province = province.trim();

    shop.openingHours = openingHours?.trim() || "07:30 - 21:00";

    if (directPurchaseEnabled !== undefined) {
      shop.directPurchaseEnabled = Boolean(directPurchaseEnabled);
    }

    if (isActive !== undefined) {
      shop.isActive = Boolean(isActive);
    }

    await shop.save();

    return res.status(200).json({
      message: "Cập nhật cửa hàng thành công",
      shop,
    });
  } catch (error) {
    console.error("Lỗi saveShop:", error);

    return res.status(500).json({
      message: "Không thể lưu thông tin cửa hàng",
      error: error.message,
    });
  }
};
