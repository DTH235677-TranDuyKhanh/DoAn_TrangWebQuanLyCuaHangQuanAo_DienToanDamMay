const express = require('express');
const router = express.Router();
const { Category } = require('../models/cac_model');
const { ensureManagerApi } = require('../utils/auth');

/**
 * ROUTE: GET /danh-muc
 * Hiển thị danh sách tất cả danh mục cho người dùng
 * 
 * Logic:
 * - Lấy tất cả danh mục từ database
 * - Render view 'danh_muc' với danh sách danh mục
 */
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

// =====================
// API CRUD DANH MỤC
// =====================
// Dùng cho quản trị hoặc tích hợp hệ thống

/**
 * ROUTE: GET /danh-muc/api
 * Lấy danh sách tất cả danh mục dạng JSON
 * 
 * Response: JSON array của tất cả danh mục
 */
router.get('/api', async (req, res) => {
  try {
    const categories = await Category.find().lean();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách danh mục' });
  }
});

/**
 * ROUTE: POST /danh-muc/api
 * Tạo danh mục mới
 * 
 * Required: ensureManagerApi middleware (kiểm tra quyền quản lý)
 * 
 * Body: Các field của Category model:
 * - name (string): Tên danh mục
 * - description (string): Mô tả
 * - slug (string): URL-friendly name
 * - isActive (boolean): Trạng thái hoạt động
 * 
 * Response: JSON object với danh mục vừa tạo
 */
router.post('/api', ensureManagerApi, async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * ROUTE: GET /danh-muc/api/:id
 * Lấy chi tiết một danh mục theo ID
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của danh mục
 * 
 * Response: JSON object của danh mục
 */
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

/**
 * ROUTE: PUT /danh-muc/api/:id
 * Cập nhật thông tin danh mục
 * 
 * Required: ensureManagerApi middleware (kiểm tra quyền quản lý)
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của danh mục
 * 
 * Body: Các field muốn cập nhật
 * 
 * Response: JSON object với danh mục đã cập nhật
 */
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

/**
 * ROUTE: DELETE /danh-muc/api/:id
 * Xóa danh mục khỏi database
 * 
 * Required: ensureManagerApi middleware (kiểm tra quyền quản lý)
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của danh mục
 * 
 * Response: JSON object với message xác nhận xóa
 */
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
