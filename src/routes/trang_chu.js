/**
 * Home Routes
 * Xử lý các route cho trang chủ và các trang tĩnh như About, Contact, Search.
 */

const express = require('express');
const router = express.Router();
const { Product, Category, ContactMessage, Subscription } = require('../models/cac_model');

// Trang chủ: lấy danh sách danh mục và sản phẩm nổi bật.
router.get('/', async (req, res) => {
  try {
    const [categories, featuredProducts] = await Promise.all([
      Category.find({ isActive: true }).lean(),
      Product.find({ isActive: true, featured: true }).limit(8).populate('category').lean()
    ]);

    res.render('trang_chu', {
      title: 'Fashion Store - Trang Chủ',
      description: 'Cửa hàng quần áo chất lượng cao',
      categories,
      featuredProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải trang chủ'
    });
  }
});

// Trang About tĩnh.
router.get('/about', (req, res) => {
  try {
    res.render('about', {
      title: 'Về Chúng Tôi'
    });
  } catch (error) {
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải trang'
    });
  }
});

// Trang Liên hệ tĩnh.
router.get('/contact', (req, res) => {
  try {
    res.render('contact', {
      title: 'Liên Hệ Chúng Tôi'
    });
  } catch (error) {
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải trang'
    });
  }
});

// Xử lý gửi tin nhắn liên hệ từ form.
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      req.session.error = 'Vui lòng điền đầy đủ thông tin';
      return res.redirect('/contact');
    }

    await ContactMessage.create({ name, email, subject, message });
    req.session.success = 'Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất!';
    res.redirect('/contact');
  } catch (error) {
    console.error(error);
    req.session.error = 'Lỗi khi gửi tin nhắn';
    res.redirect('/contact');
  }
});

// Tìm kiếm sản phẩm theo tên, mô tả hoặc tags.
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = q ? {
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ]
    } : { isActive: true };

    const results = await Product.find(filter).populate('category').lean();

    res.render('search-results', {
      title: 'Kết quả tìm kiếm',
      query: q,
      results
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tìm kiếm'
    });
  }
});

// Đăng ký nhận bản tin (newsletter).
router.post('/subscribe', async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    if (!email || !email.includes('@')) {
      req.session.error = 'Vui lòng nhập email hợp lệ.';
      return res.redirect('/');
    }

    await Subscription.findOneAndUpdate(
      { email },
      { email, source: 'homepage', isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    req.session.success = 'Đã đăng ký nhận tin thành công!';
    res.redirect('/');
  } catch (error) {
    console.error(error);
    req.session.error = 'Lỗi khi đăng ký nhận tin.';
    res.redirect('/');
  }
});

module.exports = router;
