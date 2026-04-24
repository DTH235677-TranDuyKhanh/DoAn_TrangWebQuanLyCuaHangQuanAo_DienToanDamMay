/**
 * Router Liên Hệ: Quản lý trang liên hệ, tin nhắn và đăng ký nhận tin
 */

const express = require('express');
const router = express.Router();
const { ContactMessage, Subscription } = require('../models/cac_model');

/**
 * ROUTE: GET /lien-he
 * Render trang liên hệ với form liên hệ
 */
router.get('/', (req, res) => {
  try {
    res.render('lien_he', {
      title: 'Liên hệ'
    });
  } catch (error) {
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải trang liên hệ'
    });
  }
});

/**
 * ROUTE: POST /lien-he
 * Nhận dữ liệu liên hệ từ form và lưu vào database
 * 
 * Body Parameters:
 * - name (string): Tên người gửi
 * - email (string): Email người gửi
 * - subject (string): Tiêu đề tin nhắn
 * - message (string): Nội dung tin nhắn
 * 
 * Response: JSON object với tin nhắn liên hệ vừa được tạo
 */
router.post('/', async (req, res) => {
  try {
    const contact = await ContactMessage.create(req.body);
    res.status(201).json({ success: true, contact });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * ROUTE: POST /lien-he/dang-ky-nhan-tin
 * Nhận email đăng ký nhận tin và lưu vào collection Subscription
 * 
 * Body Parameters:
 * - email (string): Email cần đăng ký
 * 
 * Response: JSON object với đăng ký nhận tin vừa được tạo
 */
router.post('/dang-ky-nhan-tin', async (req, res) => {
  try {
    const { email } = req.body;
    const subscription = await Subscription.create({ email });
    res.status(201).json({ success: true, subscription });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// =====================
// API CRUD TIN NHẮN LIÊN HỆ
// =====================

/**
 * ROUTE: GET /lien-he/api
 * Lấy danh sách tất cả tin nhắn liên hệ
 * 
 * Response: JSON array của tất cả tin nhắn
 */
router.get('/api', async (req, res) => {
  try {
    const messages = await ContactMessage.find().lean();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy tin nhắn liên hệ' });
  }
});

/**
 * ROUTE: GET /lien-he/api/:id
 * Lấy chi tiết một tin nhắn liên hệ theo ID
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của tin nhắn
 * 
 * Response: JSON object của tin nhắn
 */
router.get('/api/:id', async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id).lean();
    if (!message) {
      return res.status(404).json({ success: false, message: 'Tin nhắn không tồn tại' });
    }
    res.json(message);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy tin nhắn liên hệ' });
  }
});

/**
 * ROUTE: DELETE /lien-he/api/:id
 * Xóa tin nhắn liên hệ khỏi database
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của tin nhắn
 * 
 * Response: JSON object với message xác nhận xóa
 */
router.delete('/api/:id', async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Tin nhắn không tồn tại' });
    }
    res.json({ success: true, message: 'Đã xóa tin nhắn liên hệ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi xóa tin nhắn liên hệ' });
  }
});

module.exports = router;
