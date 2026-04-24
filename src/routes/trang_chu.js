/**
 * Home Routes
 * Xử lý các route cho trang chủ và các trang tĩnh như About, Contact, Search.
 */

const express = require('express');
const router = express.Router();
const { Product, Category, ContactMessage, Subscription } = require('../models/cac_model');

/**
 * ROUTE: GET /
 * Trang chủ: hiển thị danh mục và sản phẩm nổi bật
 * 
 * Logic:
 * - Lấy tất cả danh mục hoạt động (isActive: true)
 * - Lấy tối đa 8 sản phẩm nổi bật (featured: true, isActive: true)
 * - Sử dụng Promise.all để lấy dữ liệu song song
 * - Render view 'trang_chu' với danh sách danh mục và sản phẩm
 */
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

/**
 * ROUTE: GET /about
 * Trang About tĩnh: hiển thị thông tin về cửa hàng
 */
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

/**
 * ROUTE: GET /contact
 * Trang Liên hệ tĩnh: hiển thị form liên hệ
 */
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

/**
 * ROUTE: POST /contact
 * Xử lý gửi tin nhắn liên hệ từ form contact
 * 
 * Body Parameters:
 * - name (string): Tên người gửi
 * - email (string): Email người gửi
 * - subject (string): Tiêu đề tin nhắn
 * - message (string): Nội dung tin nhắn
 * 
 * Logic:
 * - Kiểm tra các field bắt buộc
 * - Lưu tin nhắn vào database (ContactMessage collection)
 * - Chuyển hướng về trang contact với thông báo thành công
 */
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

/**
 * ROUTE: GET /search
 * Tìm kiếm sản phẩm theo từ khóa
 * 
 * Query Parameters:
 * - q (string, optional): Từ khóa tìm kiếm (tìm trong name, description, tags)
 * 
 * Logic:
 * - Nếu có q, tìm sản phẩm hoạt động (isActive: true) khớp với từ khóa (regex, case-insensitive)
 * - Nếu không có q, trả về tất cả sản phẩm hoạt động
 * - Render view 'search-results' với kết quả tìm kiếm
 */
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

/**
 * ROUTE: POST /subscribe
 * Đăng ký nhận bản tin (newsletter)
 * 
 * Body Parameters:
 * - email (string): Email cần đăng ký
 * 
 * Logic:
 * - Kiểm tra email hợp lệ (phải chứa @)
 * - Tạo hoặc cập nhật document Subscription
 * - Chuyển hướng về trang chủ với thông báo thành công
 */
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
