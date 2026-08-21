const Book = require("../models/Book");

// Cần để kiểm tra sách có đang bị đơn hàng / tin nhắn tham chiếu không
// trước khi xóa hẳn khỏi database
const Order = require("../models/Order");
const Conversation = require("../models/Conversation");
const Wishlist = require("../models/Wishlist");

// Chuyển trường tùy chọn thành Number hoặc null
const toOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return Number(value);
};

// ======================================================
// 1. API ĐĂNG SÁCH MỚI
// ======================================================
exports.createBook = async (req, res) => {
  try {
    const {
      title,
      author,
      publisher,
      year,
      pages,
      weight,
      isbn,
      category,
      price,
      originalPrice,
      condition,
      description,
      quantity,
    } = req.body || {};

    const sellerId = req.user.userId || req.user._id;

    if (!sellerId) {
      return res.status(400).json({
        message: "Không tìm thấy ID người bán trong token",
      });
    }

    // Kiểm tra tên sách
    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập tên sách",
      });
    }

    // Kiểm tra giá bán
    const sellingPrice = Number(price);

    if (!price || Number.isNaN(sellingPrice) || sellingPrice <= 0) {
      return res.status(400).json({
        message: "Giá bán phải lớn hơn 0",
      });
    }

    const yearNumber = toOptionalNumber(year);
    const pagesNumber = toOptionalNumber(pages);
    const weightNumber = toOptionalNumber(weight);
    const originalPriceNumber = toOptionalNumber(originalPrice);

    // Số lượng: mặc định 1 nếu không nhập
    let quantityNumber = 1;

    if (quantity !== undefined && quantity !== null && quantity !== "") {
      quantityNumber = Number(quantity);

      if (!Number.isInteger(quantityNumber) || quantityNumber < 1) {
        return res.status(400).json({
          message: "Số lượng phải là số nguyên lớn hơn 0",
        });
      }
    }

    // Kiểm tra năm xuất bản
    if (
      yearNumber !== null &&
      (Number.isNaN(yearNumber) ||
        yearNumber < 1000 ||
        yearNumber > new Date().getFullYear() + 1)
    ) {
      return res.status(400).json({
        message: "Năm xuất bản không hợp lệ",
      });
    }

    // Kiểm tra số trang
    if (
      pagesNumber !== null &&
      (Number.isNaN(pagesNumber) || pagesNumber <= 0)
    ) {
      return res.status(400).json({
        message: "Số trang phải lớn hơn 0",
      });
    }

    // Kiểm tra trọng lượng
    if (
      weightNumber !== null &&
      (Number.isNaN(weightNumber) || weightNumber <= 0)
    ) {
      return res.status(400).json({
        message: "Trọng lượng phải lớn hơn 0",
      });
    }

    // Kiểm tra giá gốc
    if (
      originalPriceNumber !== null &&
      (Number.isNaN(originalPriceNumber) || originalPriceNumber <= sellingPrice)
    ) {
      return res.status(400).json({
        message: "Giá gốc phải lớn hơn giá bán để tính phần trăm giảm giá",
      });
    }

    // Lấy link ảnh đã upload lên Cloudinary
    const imageUrls = Array.isArray(req.files)
      ? req.files.map((file) => file.path)
      : [];

    if (imageUrls.length === 0) {
      return res.status(400).json({
        message: "Vui lòng tải lên ít nhất một ảnh sách",
      });
    }

    const newBook = new Book({
      sellerId,

      title: title.trim(),

      author: author ? author.trim() : "",

      publisher: publisher ? publisher.trim() : "",

      year: yearNumber,

      pages: pagesNumber,

      weight: weightNumber,

      isbn: isbn ? isbn.trim() : "",

      category,

      price: sellingPrice,

      originalPrice: originalPriceNumber,

      condition,

      description: description ? description.trim() : "",

      quantity: quantityNumber,

      images: imageUrls,
    });

    await newBook.save();

    return res.status(201).json({
      message: "Đăng tin bán sách thành công!",
      book: newBook,
    });
  } catch (error) {
    console.error("Lỗi createBook:", error);

    return res.status(500).json({
      message: "Lỗi server khi đăng sách",
      error: error.message,
    });
  }
};

// ======================================================
// 2. LẤY TOÀN BỘ SÁCH
// ======================================================
exports.getAllBooks = async (req, res) => {
  try {
    // ĐÃ SỬA: limit trước đây không có trần -> ?limit=999999
    // là dump sạch database trong một request.
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const requestedLimit = parseInt(req.query.limit, 10) || 10;

    const limit = Math.min(Math.max(requestedLimit, 1), 50);

    const skip = (page - 1) * limit;

    const query = {
      status: {
        $ne: "deleted",
      },
    };

    if (req.query.category && req.query.category.toLowerCase() !== "all") {
      query.category = req.query.category;
    }

    if (req.query.search) {
      // ĐÃ SỬA: trước đây nhét thẳng chuỗi người dùng vào RegExp.
      // Gõ "(a+)+$" là treo server (ReDoS). Giờ vô hiệu hóa toàn bộ
      // ký tự đặc biệt của regex và giới hạn độ dài từ khóa.
      const rawSearch = String(req.query.search).slice(0, 100);

      const escapedSearch = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const searchRegex = new RegExp(escapedSearch, "i");

      query.$or = [
        {
          title: searchRegex,
        },
        {
          author: searchRegex,
        },
      ];
    }

    const [books, totalCount] = await Promise.all([
      Book.find(query)
        .populate("sellerId", "fullName university phoneNumber")
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),

      Book.countDocuments(query),
    ]);

    return res.status(200).json({
      books,

      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      },
    });
  } catch (error) {
    console.error("Lỗi getAllBooks:", error);

    return res.status(500).json({
      message: "Lỗi server khi lấy danh sách sách",
      error: error.message,
    });
  }
};

// ======================================================
// 3. LẤY DANH SÁCH SÁCH CỦA ADMIN
// ======================================================
exports.getMyBooks = async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user._id;

    const myBooks = await Book.find({
      sellerId: currentUserId,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      data: myBooks,
    });
  } catch (error) {
    console.error("Lỗi getMyBooks:", error);

    return res.status(500).json({
      message: "Lỗi server khi lấy sách cá nhân",
      error: error.message,
    });
  }
};

// ======================================================
// 4. LẤY CHI TIẾT MỘT CUỐN SÁCH
// ======================================================
exports.getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate(
      "sellerId",
      "fullName university phoneNumber avatar",
    );

    if (!book) {
      return res.status(404).json({
        message: "Không tìm thấy sách",
      });
    }

    return res.status(200).json(book);
  } catch (error) {
    console.error("Lỗi getBookById:", error);

    return res.status(500).json({
      message: "Lỗi khi lấy chi tiết sách",
      error: error.message,
    });
  }
};

// ======================================================
// 5. CẬP NHẬT SÁCH
// ======================================================
exports.updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Không tìm thấy sách",
      });
    }

    const currentUserId = req.user.userId || req.user._id;

    if (book.sellerId.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền sửa sách này",
      });
    }

    const allowedFields = [
      "title",
      "author",
      "publisher",
      "year",
      "pages",
      "weight",
      "isbn",
      "description",
      "category",
      "price",
      "originalPrice",
      "condition",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        book[field] = req.body[field];
      }
    });

    // ==================================================
    // ẢNH SÁCH — ĐÃ THÊM
    // --------------------------------------------------
    // Trước đây updateBook không hề đụng tới book.images, nên
    // admin không có cách nào đổi ảnh sau khi đăng sách.
    //   - removeImages : danh sách URL ảnh cần gỡ bỏ
    //   - req.files    : ảnh mới, đã được Multer đẩy lên
    //                    Cloudinary, URL nằm ở file.path
    // ==================================================
    let danhSachAnh = [...book.images];

    if (req.body.removeImages) {
      const canXoa = Array.isArray(req.body.removeImages)
        ? req.body.removeImages
        : [req.body.removeImages];

      danhSachAnh = danhSachAnh.filter((url) => !canXoa.includes(url));
    }

    if (Array.isArray(req.files) && req.files.length > 0) {
      danhSachAnh = [...danhSachAnh, ...req.files.map((file) => file.path)];
    }

    if (danhSachAnh.length > 10) {
      return res.status(400).json({
        message: "Tối đa 10 ảnh mỗi cuốn sách.",
      });
    }

    book.images = danhSachAnh;

    // Chuyển các trường số
    if (req.body.year !== undefined) {
      book.year = toOptionalNumber(req.body.year);
    }

    if (req.body.pages !== undefined) {
      book.pages = toOptionalNumber(req.body.pages);
    }

    if (req.body.weight !== undefined) {
      book.weight = toOptionalNumber(req.body.weight);
    }

    if (req.body.price !== undefined) {
      book.price = Number(req.body.price);
    }

    if (req.body.originalPrice !== undefined) {
      book.originalPrice = toOptionalNumber(req.body.originalPrice);
    }

    if (book.originalPrice !== null && book.originalPrice <= book.price) {
      return res.status(400).json({
        message: "Giá gốc phải lớn hơn giá bán",
      });
    }

    // Cho phép nhập thêm / điều chỉnh số lượng còn lại
    if (req.body.quantity !== undefined) {
      const quantityNumber = Number(req.body.quantity);

      if (!Number.isInteger(quantityNumber) || quantityNumber < 0) {
        return res.status(400).json({
          message: "Số lượng không hợp lệ",
        });
      }

      book.quantity = quantityNumber;

      // Tự đồng bộ trạng thái theo số lượng còn lại
      if (quantityNumber > 0 && book.status === "sold") {
        book.status = "available";
      }

      if (quantityNumber === 0 && book.status === "available") {
        book.status = "sold";
      }
    }

    await book.save();

    return res.status(200).json({
      message: "Cập nhật sách thành công!",
      book,
    });
  } catch (error) {
    console.error("Lỗi updateBook:", error);

    return res.status(500).json({
      message: "Lỗi khi cập nhật sách",
      error: error.message,
    });
  }
};

// ======================================================
// 6. XÓA SÁCH — SOFT DELETE
// ======================================================
exports.deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Không tìm thấy sách",
      });
    }

    const currentUserId = req.user.userId || req.user._id;

    if (book.sellerId.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền xóa sách này",
      });
    }

    if (book.status === "sold") {
      return res.status(400).json({
        message: "Không thể xóa sách đã bán thành công",
      });
    }

    // ==================================================
    // XÓA HẲN HAY XÓA MỀM? — ĐÃ SỬA
    // --------------------------------------------------
    // Trước đây luôn xóa mềm, nên sách vẫn nằm lại trong
    // bảng quản lý với nhãn "Đã xóa". Giờ:
    //   - Chưa ai đặt mua / nhắn tin  -> XÓA HẲN khỏi DB
    //   - Đã có đơn hàng / tin nhắn   -> chỉ xóa mềm, vì
    //     xóa hẳn sẽ làm lịch sử mua hàng của khách trỏ
    //     vào một cuốn sách không còn tồn tại
    // ==================================================
    const [soDonHang, soHoiThoai] = await Promise.all([
      Order.countDocuments({ bookId: book._id }),
      Conversation.countDocuments({ bookId: book._id }),
    ]);

    if (soDonHang === 0 && soHoiThoai === 0) {
      // Wishlist xóa theo được, không ảnh hưởng lịch sử giao dịch
      await Wishlist.deleteMany({ bookId: book._id });

      await Book.deleteOne({ _id: book._id });

      return res.status(200).json({
        message: "Đã xóa vĩnh viễn cuốn sách này!",
        hardDeleted: true,
      });
    }

    book.status = "deleted";

    await book.save();

    return res.status(200).json({
      message:
        `Sách đã được ẩn khỏi cửa hàng. Không thể xóa vĩnh viễn vì đang có ` +
        `${soDonHang} đơn hàng và ${soHoiThoai} cuộc trò chuyện liên quan — ` +
        `xóa hẳn sẽ làm hỏng lịch sử mua hàng của khách.`,
      hardDeleted: false,
    });
  } catch (error) {
    console.error("Lỗi deleteBook:", error);

    return res.status(500).json({
      message: "Lỗi server khi xóa sách",
      error: error.message,
    });
  }
};

// ======================================================
// 7. XEM SÁCH CỦA MỘT NGƯỜI BÁN
// ======================================================
exports.getBooksBySeller = async (req, res) => {
  try {
    const books = await Book.find({
      sellerId: req.params.sellerId,
      status: "available",
    })
      .populate("sellerId", "fullName university avatar")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json(books);
  } catch (error) {
    console.error("Lỗi getBooksBySeller:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// ======================================================
// 8. ĐÁNH DẤU SÁCH ĐÃ BÁN
// ======================================================
exports.markAsSold = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Không tìm thấy sách",
      });
    }

    const currentUserId = req.user.userId || req.user._id;

    if (book.sellerId.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền cập nhật sách này",
      });
    }

    book.status = "sold";

    await book.save();

    return res.status(200).json({
      message: "Đã đánh dấu sách là đã bán!",
      book,
    });
  } catch (error) {
    console.error("Lỗi markAsSold:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// ======================================================
// 9. ẨN SÁCH
// ======================================================
exports.hideBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Không tìm thấy sách",
      });
    }

    const currentUserId = req.user.userId || req.user._id;

    if (book.sellerId.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền ẩn sách này",
      });
    }

    book.status = "hidden";

    await book.save();

    return res.status(200).json({
      message: "Đã ẩn sách!",
      book,
    });
  } catch (error) {
    console.error("Lỗi hideBook:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// ======================================================
// 10. HIỆN SÁCH LẠI
// ======================================================
exports.showBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Không tìm thấy sách",
      });
    }

    const currentUserId = req.user.userId || req.user._id;

    if (book.sellerId.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền hiện sách này",
      });
    }

    book.status = "available";

    await book.save();

    return res.status(200).json({
      message: "Đã hiện sách!",
      book,
    });
  } catch (error) {
    console.error("Lỗi showBook:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};
