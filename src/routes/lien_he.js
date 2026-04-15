const express = require('express');
const router = express.Router();
const { ContactMessage, Subscription } = require('../models/cac_model');

// Trang liên hệ
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

// Gửi liên hệ
router.post('/', async (req, res) => {
  try {
    const contact = await ContactMessage.create(req.body);
    res.status(201).json({ success: true, contact });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Đăng ký nhận tin
router.post('/dang-ky-nhan-tin', async (req, res) => {
  try {
    const { email } = req.body;
    const subscription = await Subscription.create({ email });
    res.status(201).json({ success: true, subscription });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// API CRUD tin nhắn liên hệ
router.get('/api', async (req, res) => {
  try {
    const messages = await ContactMessage.find().lean();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy tin nhắn liên hệ' });
  }
});

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
