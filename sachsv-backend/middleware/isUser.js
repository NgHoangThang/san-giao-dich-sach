const isUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Bạn chưa đăng nhập",
    });
  }

  // student và user đều được xem là người mua
  const buyerRoles = ["student", "user"];

  if (!buyerRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: "Chức năng này chỉ dành cho người mua",
    });
  }

  next();
};

module.exports = isUser;
