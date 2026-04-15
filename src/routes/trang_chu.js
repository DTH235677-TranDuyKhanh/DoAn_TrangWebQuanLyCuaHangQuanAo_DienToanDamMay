/**
 * Home Routes
 * Xử lý các route cho trang chủ và các trang chính
 */

const express = require('express');
const router = express.Router();
const { Product, Category, ContactMessage, Subscription } = require('../models/cac_model');

// Trang chủ
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

// Trang về chúng tôi
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

// Trang liên hệ
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

// Xử lý form liên hệ
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

// Tìm kiếm sản phẩm
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

// Đăng ký newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email hợp lệ'
      });
    }

    await Subscription.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { email: email.toLowerCase().trim(), source: 'homepage', isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      message: 'Đã đăng ký nhận tin thành công!'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đăng ký'
    });
  }
});

module.exports = router;
