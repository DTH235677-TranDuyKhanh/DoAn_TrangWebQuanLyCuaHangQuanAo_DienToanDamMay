function ensureAuthenticated(req, res, next) {
  if (!req.session?.user) {
    req.session.error = 'Vui lòng đăng nhập để truy cập trang này.';
    return res.redirect('/nguoi-dung/dang-nhap');
  }
  next();
}

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
