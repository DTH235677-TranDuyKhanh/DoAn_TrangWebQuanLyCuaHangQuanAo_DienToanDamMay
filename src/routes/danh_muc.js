const express = require('express');
const router = express.Router();
const { Category } = require('../models/cac_model');
const { ensureManagerApi } = require('../utils/auth');

// Danh sách danh mục
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().lean();
    res.render('danh_muc', {
      title: 'Danh mục',
      description: 'Khám phá các danh mục thời trang',
      categories
    });
  } catch (error) {
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải danh mục'
    });
  }
});

// API CRUD danh mục
router.get('/api', async (req, res) => {
  try {
    const categories = await Category.find().lean();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách danh mục' });
  }
});

router.post('/api', ensureManagerApi, async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/api/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    if (!category) {
      return res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh mục' });
  }
});

router.put('/api/:id', ensureManagerApi, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
    }
    res.json({ success: true, category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/api/:id', ensureManagerApi, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
    }
    res.json({ success: true, message: 'Đã xóa danh mục' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi xóa danh mục' });
  }
});

module.exports = router;
