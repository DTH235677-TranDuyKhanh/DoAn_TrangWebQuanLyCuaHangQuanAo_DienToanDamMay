// Router xử lý người dùng, đăng nhập, đăng ký và Google OAuth.
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

// Helper: gửi form URL encoded tới một endpoint HTTPS.
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

// Helper: lấy JSON từ một URL có authorization header.
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

// Tạo URL chuyển hướng Google OAuth.
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

// Render trang đăng nhập và kiểm tra phiên nếu đã đăng nhập.
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

// Chuyển hướng người dùng tới Google để xác thực OAuth.
router.get('/dang-nhap/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('YOUR_') || !GOOGLE_CLIENT_SECRET || GOOGLE_CLIENT_SECRET.startsWith('YOUR_')) {
    req.session.error = 'Google OAuth chưa cấu hình. Vui lòng thiết lập GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET.';
    return res.redirect('/nguoi-dung/dang-nhap');
  }
  res.redirect(buildGoogleAuthUrl());
});

// Callback Google OAuth: xử lý mã xác thực và lấy thông tin người dùng.
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

// Xử lý đăng nhập bằng email và mật khẩu.
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

// Trang đăng ký tài khoản.
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

// Xử lý đăng ký, tạo user mới và lưu session.
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

// Đăng xuất: xóa session và cookie.
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

// API CRUD người dùng (fetch, update, delete).
router.get('/api', async (req, res) => {
  try {
    const users = await User.find().lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách người dùng' });
  }
});

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

// Trang thông tin tài khoản - hiển thị thông tin hiện tại.
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

// Cập nhật thông tin hồ sơ người dùng.
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
