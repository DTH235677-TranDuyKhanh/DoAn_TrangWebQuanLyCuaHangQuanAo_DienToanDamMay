// Middleware bảo vệ route bằng session.
// Dùng khi người dùng cần phải đăng nhập mới xem được.
// Middleware xác thực chung cho ứng dụng.
// Dùng để bảo vệ các route cần login hoặc quyền quản trị.
function ensureAuthenticated(req, res, next) {
  if (!req.session?.user) {
    req.session.error = 'Vui lòng đăng nhập để truy cập trang này.';
    return res.redirect('/nguoi-dung/dang-nhap');
  }
  next();
}

// Middleware cho các trang quản trị nội bộ.
// Chỉ cho phép role là manager hoặc admin truy cập.
function ensureManager(req, res, next) {
  if (!req.session?.user) {
    req.session.error = 'Vui lòng đăng nhập để truy cập trang này.';
    return res.redirect('/nguoi-dung/dang-nhap');
  }

  const role = req.session.user.role;
  if (!['manager', 'admin'].includes(role)) {
    return res.status(403).render('error', {
      status: 403,
      message: 'Bạn không có quyền thực hiện hành động này.'
    });
  }
  next();
}

// Middleware cho API quản trị trả về JSON lỗi nếu không có quyền.
function ensureManagerApi(req, res, next) {
  if (!req.session?.user || !['manager', 'admin'].includes(req.session.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền thực hiện hành động này.'
    });
  }
  next();
}

module.exports = {
  ensureAuthenticated,
  ensureManager,
  ensureManagerApi
};
