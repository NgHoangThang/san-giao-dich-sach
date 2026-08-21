const Address = require("../models/Address");

// ======================================================
// 1. LẤY DANH SÁCH ĐỊA CHỈ CỦA USER
// GET /api/addresses
// ======================================================
exports.getMyAddresses = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const addresses = await Address.find({
      userId,
    }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    return res.status(200).json(addresses);
  } catch (error) {
    console.error("Lỗi getMyAddresses:", error);

    return res.status(500).json({
      message: "Không thể lấy danh sách địa chỉ",
      error: error.message,
    });
  }
};

// ======================================================
// 2. THÊM ĐỊA CHỈ MỚI
// POST /api/addresses
// ======================================================
exports.createAddress = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const {
      label,
      receiverName,
      phoneNumber,
      addressLine,
      ward,
      province,
      note,
      isDefault,
    } = req.body || {};

    // ==================================================
    // VALIDATE
    // ==================================================
    if (!receiverName?.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập tên người nhận",
      });
    }

    if (!phoneNumber?.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập số điện thoại",
      });
    }

    const phoneDigits = phoneNumber.replace(/\D/g, "");

    if (phoneDigits.length < 9 || phoneDigits.length > 11) {
      return res.status(400).json({
        message: "Số điện thoại không hợp lệ",
      });
    }

    if (!addressLine?.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập địa chỉ",
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
    // KIỂM TRA USER ĐÃ CÓ ĐỊA CHỈ CHƯA
    // Địa chỉ đầu tiên tự động là mặc định
    // ==================================================
    const addressCount = await Address.countDocuments({
      userId,
    });

    const shouldBeDefault = addressCount === 0 || isDefault === true;

    // Nếu địa chỉ mới là mặc định
    // bỏ mặc định của các địa chỉ cũ
    if (shouldBeDefault) {
      await Address.updateMany(
        {
          userId,
        },
        {
          $set: {
            isDefault: false,
          },
        },
      );
    }

    // ==================================================
    // TẠO ADDRESS
    // ==================================================
    const address = await Address.create({
      userId,

      label: label?.trim() || "Nhà",

      receiverName: receiverName.trim(),

      phoneNumber: phoneNumber.trim(),

      addressLine: addressLine.trim(),

      ward: ward.trim(),

      province: province.trim(),

      note: note?.trim() || "",

      isDefault: shouldBeDefault,
    });

    return res.status(201).json({
      message: "Thêm địa chỉ thành công",
      address,
    });
  } catch (error) {
    console.error("Lỗi createAddress:", error);

    return res.status(500).json({
      message: "Không thể thêm địa chỉ",
      error: error.message,
    });
  }
};

// ======================================================
// 3. CẬP NHẬT ĐỊA CHỈ
// PATCH /api/addresses/:id
// ======================================================
exports.updateAddress = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const { id } = req.params;

    const address = await Address.findOne({
      _id: id,
      userId,
    });

    if (!address) {
      return res.status(404).json({
        message: "Không tìm thấy địa chỉ",
      });
    }

    const {
      label,
      receiverName,
      phoneNumber,
      addressLine,
      ward,
      province,
      note,
      isDefault,
    } = req.body || {};

    // ==================================================
    // UPDATE CÁC FIELD
    // ==================================================
    if (label !== undefined) {
      address.label = label.trim() || "Nhà";
    }

    if (receiverName !== undefined) {
      if (!receiverName.trim()) {
        return res.status(400).json({
          message: "Tên người nhận không được để trống",
        });
      }

      address.receiverName = receiverName.trim();
    }

    if (phoneNumber !== undefined) {
      if (!phoneNumber.trim()) {
        return res.status(400).json({
          message: "Số điện thoại không được để trống",
        });
      }

      const phoneDigits = phoneNumber.replace(/\D/g, "");

      if (phoneDigits.length < 9 || phoneDigits.length > 11) {
        return res.status(400).json({
          message: "Số điện thoại không hợp lệ",
        });
      }

      address.phoneNumber = phoneNumber.trim();
    }

    if (addressLine !== undefined) {
      if (!addressLine.trim()) {
        return res.status(400).json({
          message: "Địa chỉ không được để trống",
        });
      }

      address.addressLine = addressLine.trim();
    }

    if (ward !== undefined) {
      if (!ward.trim()) {
        return res.status(400).json({
          message: "Phường/Xã không được để trống",
        });
      }

      address.ward = ward.trim();
    }

    if (province !== undefined) {
      if (!province.trim()) {
        return res.status(400).json({
          message: "Tỉnh/Thành phố không được để trống",
        });
      }

      address.province = province.trim();
    }

    if (note !== undefined) {
      address.note = note.trim();
    }

    // ==================================================
    // NẾU CHỌN LÀM MẶC ĐỊNH
    // ==================================================
    if (isDefault === true) {
      await Address.updateMany(
        {
          userId,
          _id: {
            $ne: address._id,
          },
        },
        {
          $set: {
            isDefault: false,
          },
        },
      );

      address.isDefault = true;
    }

    await address.save();

    return res.status(200).json({
      message: "Cập nhật địa chỉ thành công",
      address,
    });
  } catch (error) {
    console.error("Lỗi updateAddress:", error);

    return res.status(500).json({
      message: "Không thể cập nhật địa chỉ",
      error: error.message,
    });
  }
};

// ======================================================
// 4. ĐẶT ĐỊA CHỈ MẶC ĐỊNH
// PATCH /api/addresses/:id/default
// ======================================================
exports.setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const { id } = req.params;

    const address = await Address.findOne({
      _id: id,
      userId,
    });

    if (!address) {
      return res.status(404).json({
        message: "Không tìm thấy địa chỉ",
      });
    }

    // ==================================================
    // BỎ DEFAULT TẤT CẢ ĐỊA CHỈ CỦA USER
    // ==================================================
    await Address.updateMany(
      {
        userId,
      },
      {
        $set: {
          isDefault: false,
        },
      },
    );

    // ==================================================
    // SET ADDRESS ĐƯỢC CHỌN LÀ DEFAULT
    // ==================================================
    address.isDefault = true;

    await address.save();

    return res.status(200).json({
      message: "Đã đặt làm địa chỉ mặc định",
      address,
    });
  } catch (error) {
    console.error("Lỗi setDefaultAddress:", error);

    return res.status(500).json({
      message: "Không thể đặt địa chỉ mặc định",
      error: error.message,
    });
  }
};

// ======================================================
// 5. XÓA ĐỊA CHỈ
// DELETE /api/addresses/:id
// ======================================================
exports.deleteAddress = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;

    const { id } = req.params;

    const address = await Address.findOne({
      _id: id,
      userId,
    });

    if (!address) {
      return res.status(404).json({
        message: "Không tìm thấy địa chỉ",
      });
    }

    const wasDefault = address.isDefault;

    await address.deleteOne();

    // ==================================================
    // NẾU XÓA ĐỊA CHỈ MẶC ĐỊNH
    // → lấy địa chỉ mới nhất còn lại làm mặc định
    // ==================================================
    if (wasDefault) {
      const nextAddress = await Address.findOne({
        userId,
      }).sort({
        createdAt: -1,
      });

      if (nextAddress) {
        nextAddress.isDefault = true;

        await nextAddress.save();
      }
    }

    return res.status(200).json({
      message: "Xóa địa chỉ thành công",
    });
  } catch (error) {
    console.error("Lỗi deleteAddress:", error);

    return res.status(500).json({
      message: "Không thể xóa địa chỉ",
      error: error.message,
    });
  }
};
