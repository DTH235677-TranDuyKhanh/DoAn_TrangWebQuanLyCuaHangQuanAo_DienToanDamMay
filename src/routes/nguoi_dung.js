/**
 * Router Người Dùng: Xử lý đăng nhập, đăng ký, Google OAuth và quản lý tài khoản
 */

const express = require('express');
const https = require('https');
const querystring = require('querystring');
const crypto = require('crypto');
const router = express.Router();
const { User } = require('../models/cac_model');
const SESSION_NAME = process.env.SESSION_NAME || 'iNews';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'https://doan-trangwebquanlycuahangquanao.onrender.com/nguoi-dung/dang-nhap/google/callback';
const GOOGLE_SCOPE = ['openid', 'email', 'profile'].join(' ');

console.log('Google OAuth config:', {
  clientId: GOOGLE_CLIENT_ID,
  clientSecretSet: GOOGLE_CLIENT_SECRET !== 'YOUR_GOOGLE_CLIENT_SECRET',
  callbackUrl: GOOGLE_CALLBACK_URL
});

/**
 * Helper: Gửi form URL encoded tới một endpoint HTTPS
 * @param {string} host - Tên host (ví dụ: "oauth2.googleapis.com")
 * @param {string} path - Đường dẫn endpoint (ví dụ: "/token")
 * @param {Object} data - Dữ liệu cần gửi
 * @returns {Promise} Promise trả về JSON response từ server
 */
function postForm(host, path, data) {
  const payload = querystring.stringify(data);

  return new Promise((resolve, reject) => {
    const options = {
      host,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Helper: Lấy JSON từ một URL có authorization header
 * @param {string} url - URL cần gọi
 * @param {string} token - Access token
 * @returns {Promise} Promise trả về JSON response từ server
 */
function getJson(url, token) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };

    https.get(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Helper: Tạo URL chuyển hướng Google OAuth
 * @returns {string} URL để chuyển hướng người dùng tới Google login
 */
function buildGoogleAuthUrl() {
  const params = querystring.stringify({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: GOOGLE_SCOPE,
    access_type: 'online',
    prompt: 'select_account'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * ROUTE: GET /nguoi-dung/dang-nhap
 * Hiển thị trang đăng nhập
 * 
 * Logic:
 * - Nếu đã đăng nhập (có session.user), chuyển hướng tới trang tài khoản
 * - Render view 'dang_nhap' để người dùng nhập email/password
 */
router.get('/dang-nhap', (req, res) => {
  try {
    if (req.session.user) {
      return res.redirect('/nguoi-dung/tai-khoan');
    }

    res.render('dang_nhap', {
      title: 'Đăng nhập'
    });
  } catch (error) {
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải trang đăng nhập'
    });
  }
});

/**
 * ROUTE: GET /nguoi-dung/dang-nhap/google
 * Chuyển hướng người dùng tới Google để xác thực OAuth
 * 
 * Logic:
 * - Kiểm tra cấu hình Google OAuth có đầy đủ không
 * - Nếu chưa cấu hình, thông báo lỗi
 * - Nếu có, chuyển hướng tới Google login URL
 */
router.get('/dang-nhap/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('YOUR_') || !GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET.startsWith('YOUR_')) {
    req.session.error = 'Google OAuth chưa cấu hình. Vui lòng thiết lập GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET.';
    return res.redirect('/nguoi-dung/dang-nhap');
  }
  res.redirect(buildGoogleAuthUrl());
});

/**
 * ROUTE: GET /nguoi-dung/dang-nhap/google/callback
 * Callback sau khi người dùng xác thực với Google
 * 
 * Logic:
 * - Lấy authorization code từ Google
 * - Đổi code lấy access token
 * - Dùng access token lấy thông tin user từ Google
 * - Tìm hoặc tạo user trong DB
 * - Lưu thông tin vào session và chuyển hướng
 */
router.get('/dang-nhap/google/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    req.session.error = 'Không nhận được mã xác thực từ Google.';
    return res.redirect('/nguoi-dung/dang-nhap');
  }

  try {
    const tokenResponse = await postForm('oauth2.googleapis.com', '/token', {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code'
    });

    if (!tokenResponse.access_token) {
      throw new Error('Không lấy được access token từ Google.');
    }

    const userInfo = await getJson('https://www.googleapis.com/oauth2/v3/userinfo', tokenResponse.access_token);
    if (!userInfo || !userInfo.email) {
      throw new Error('Không lấy được thông tin email từ Google.');
    }

    const normalizedEmail = userInfo.email.toLowerCase().trim();
    let user = await User.findOne({ $or: [{ googleId: userInfo.sub }, { email: normalizedEmail }] });

    if (user) {
      if (!user.googleId) {
        user.googleId = userInfo.sub;
        await user.save();
      }
    } else {
      user = await User.create({
        name: userInfo.name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        googleId: userInfo.sub,
        password: crypto.randomBytes(24).toString('hex'),
        isVerified: true
      });
    }

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    req.session.success = 'Đăng nhập bằng Google thành công!';
    res.redirect('/nguoi-dung/tai-khoan');
  } catch (error) {
    console.error('Google login error:', error);
    req.session.error = 'Đăng nhập Google không thành công. Vui lòng thử lại.';
    res.redirect('/nguoi-dung/dang-nhap');
  }
});

/**
 * ROUTE: POST /nguoi-dung/dang-nhap
 * Xử lý đăng nhập bằng email và mật khẩu
 * 
 * Body Parameters:
 * - email (string): Email người dùng
 * - password (string): Mật khẩu
 * 
 * Logic:
 * - Kiểm tra email và password có được nhập không
 * - Tìm user trong DB với email (lowercase trim) và password
 * - Nếu không tìm thấy, thông báo lỗi
 * - Nếu tìm thấy, lưu thông tin vào session
 */
router.post('/dang-nhap', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      req.session.error = 'Vui lòng nhập email và mật khẩu';
      return res.redirect('/nguoi-dung/dang-nhap');
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), password }).lean();
    if (!user) {
      req.session.error = 'Email hoặc mật khẩu không đúng';
      return res.redirect('/nguoi-dung/dang-nhap');
    }

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    req.session.success = 'Đăng nhập thành công!';

    res.redirect('/nguoi-dung/tai-khoan');
  } catch (error) {
    console.error(error);
    req.session.error = 'Lỗi khi đăng nhập. Vui lòng thử lại.';
    res.redirect('/nguoi-dung/dang-nhap');
  }
});

/**
 * ROUTE: GET /nguoi-dung/dang-ky
 * Hiển thị trang đăng ký tài khoản
 * 
 * Logic:
 * - Nếu đã đăng nhập, chuyển hướng tới trang tài khoản
 * - Render view 'dang_ky' để người dùng nhập thông tin đăng ký
 */
router.get('/dang-ky', (req, res) => {
  try {
    if (req.session.user) {
      return res.redirect('/nguoi-dung/tai-khoan');
    }

    res.render('dang_ky', {
      title: 'Đăng ký'
    });
  } catch (error) {
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải trang đăng ký'
    });
  }
});

/**
 * ROUTE: POST /nguoi-dung/dang-ky
 * Xử lý đăng ký, tạo user mới và lưu session
 * 
 * Body Parameters:
 * - email (string): Email (sẽ convert thành lowercase)
 * - password (string): Mật khẩu
 * - name (string): Tên người dùng
 * 
 * Logic:
 * - Kiểm tra các field bắt buộc
 * - Tạo user mới với dữ liệu từ form
 * - Nếu email đã tồn tại (lỗi 11000 duplicate key), thông báo
 * - Lưu thông tin vào session và chuyển hướng
 */
router.post('/dang-ky', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      req.session.error = 'Vui lòng điền đầy đủ thông tin đăng ký';
      return res.redirect('/nguoi-dung/dang-ky');
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password
    });

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    req.session.success = 'Đăng ký thành công!';

    res.redirect('/nguoi-dung/tai-khoan');
  } catch (error) {
    console.error(error);
    req.session.error = error.code === 11000 ? 'Email đã được sử dụng' : (error.message || 'Lỗi khi đăng ký');
    res.redirect('/nguoi-dung/dang-ky');
  }
});

/**
 * ROUTE: GET /nguoi-dung/dang-xuat
 * Đăng xuất: xóa session và cookie
 * 
 * Logic:
 * - Hủy session từ server
 * - Xóa session cookie
 * - Chuyển hướng về trang chủ
 */
router.get('/dang-xuat', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Lỗi khi đăng xuất:', err);
      return res.redirect('/nguoi-dung/tai-khoan');
    }

    res.clearCookie(SESSION_NAME);
    req.session = null;
    res.redirect('/');
  });
});

// =====================
// API CRUD NGƯỜI DÙNG
// =====================

/**
 * ROUTE: GET /nguoi-dung/api
 * Lấy danh sách tất cả người dùng
 * 
 * Response: JSON array của tất cả users
 */
router.get('/api', async (req, res) => {
  try {
    const users = await User.find().lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách người dùng' });
  }
});

/**
 * ROUTE: GET /nguoi-dung/api/:id
 * Lấy chi tiết một người dùng theo ID
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của người dùng
 * 
 * Response: JSON object của user
 */
router.get('/api/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy người dùng' });
  }
});

/**
 * ROUTE: PUT /nguoi-dung/api/:id
 * Cập nhật thông tin người dùng
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của người dùng
 * 
 * Body: Các field muốn cập nhật
 * 
 * Response: JSON object với user đã cập nhật
 */
router.put('/api/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * ROUTE: DELETE /nguoi-dung/api/:id
 * Xóa người dùng khỏi database
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của người dùng
 * 
 * Response: JSON object với message xác nhận xóa
 */
router.delete('/api/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }
    res.json({ success: true, message: 'Đã xóa người dùng' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi xóa người dùng' });
  }
});

/**
 * ROUTE: GET /nguoi-dung/tai-khoan
 * Hiển thị trang thông tin tài khoản cá nhân
 * 
 * Logic:
 * - Kiểm tra người dùng đã đăng nhập chưa
 * - Nếu chưa, chuyển hướng tới trang đăng nhập
 * - Lấy thông tin user từ DB dựa trên session.user.id
 * - Render view 'thong_tin_nguoi_dung' với thông tin user
 */
router.get('/tai-khoan', async (req, res) => {
  try {
    if (!req.session.user) {
      req.session.error = 'Vui lòng đăng nhập để truy cập tài khoản';
      return res.redirect('/nguoi-dung/dang-nhap');
    }

    const user = await User.findById(req.session.user.id).lean();
    res.render('thong_tin_nguoi_dung', {
      title: 'Tài khoản của tôi',
      user
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải trang tài khoản'
    });
  }
});

/**
 * ROUTE: POST /nguoi-dung/tai-khoan
 * Cập nhật thông tin hồ sơ người dùng
 * 
 * Body Parameters:
 * - name (string): Tên đầy đủ
 * - phone (string): Số điện thoại
 * - street (string): Đường phố
 * - city (string): Thành phố
 * - state (string): Tỉnh/thành phố
 * - postalCode (string): Mã bưu điện
 * - country (string): Quốc gia
 * 
 * Logic:
 * - Kiểm tra đăng nhập
 * - Cập nhật thông tin cá nhân và địa chỉ
 * - Cập nhật session với thông tin mới
 * - Chuyển hướng với thông báo thành công
 */
router.post('/tai-khoan', async (req, res) => {
  try {
    if (!req.session.user) {
      req.session.error = 'Vui lòng đăng nhập trước khi cập nhật thông tin';
      return res.redirect('/nguoi-dung/dang-nhap');
    }

    const updates = {
      name: req.body.name?.trim(),
      phone: req.body.phone?.trim(),
      address: {
        street: req.body.street?.trim(),
        city: req.body.city?.trim(),
        state: req.body.state?.trim(),
        postalCode: req.body.postalCode?.trim(),
        country: req.body.country?.trim(),
        phone: req.body.phone?.trim()
      }
    };

    const user = await User.findByIdAndUpdate(req.session.user.id, updates, {
      new: true,
      runValidators: true
    }).lean();

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    req.session.success = 'Cập nhật thông tin tài khoản thành công';
    res.redirect('/nguoi-dung/tai-khoan');
  } catch (error) {
    console.error(error);
    req.session.error = error.message || 'Lỗi khi cập nhật thông tin';
    res.redirect('/nguoi-dung/tai-khoan');
  }
});

module.exports = router;
