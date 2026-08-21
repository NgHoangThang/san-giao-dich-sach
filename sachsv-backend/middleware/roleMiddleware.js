const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Kiểm tra xem user có tồn tại và role của họ có nằm trong danh sách cho phép không
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Truy cập bị từ chối: Bạn không có quyền Quản trị viên!",
      });
    }
    next();
  };
};

module.exports = { authorizeRoles };
