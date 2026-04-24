const express = require('express');
const router = express.Router();
const { Product, Category } = require('../models/cac_model');
const { ensureManagerApi } = require('../utils/auth');

/**
 * ROUTE: GET /san-pham
 * Danh sách sản phẩm công khai với hỗ trợ lọc theo danh mục và tìm kiếm
 * 
 * Query Parameters:
 * - category (string, optional): slug hoặc tên danh mục để lọc
 * - q (string, optional): từ khóa tìm kiếm (tìm trong name, description, tags)
 * 
 * Logic:
 * - Chỉ hiển thị sản phẩm có isActive: true
 * - Nếu có category, tìm danh mục theo slug hoặc name
 * - Nếu có q, tìm kiếm bằng regex (case-insensitive)
 * - Render view 'san_pham' với danh sách sản phẩm
 */
router.get('/', async (req, res) => {
  try {
    const { category, q } = req.query;
    const filter = { isActive: true };
    let selectedCategory = null;

    if (category) {
      selectedCategory = await Category.findOne({
        $or: [{ slug: category }, { name: category }],
        isActive: true
      }).lean();
      if (selectedCategory) {
        filter.category = selectedCategory._id;
      }
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter).populate('category').lean();
    const title = selectedCategory ? `Sản phẩm - ${selectedCategory.name}` : 'Sản phẩm';
    const description = q ? `Kết quả tìm kiếm cho "${q}"` : 'Khám phá bộ sưu tập sản phẩm mới nhất';

    res.render('san_pham', {
      title,
      description,
      products,
      selectedCategory,
      query: q
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải danh sách sản phẩm'
    });
  }
});

/**
 * ROUTE: GET /san-pham/api
 * Lấy danh sách tất cả sản phẩm (kể cả inactive) dạng JSON
 * Được đặt TRƯỚC route /:slug để tránh trùng URL với slug "api"
 * 
 * Response: JSON array của tất cả sản phẩm với thông tin category đầy đủ
 */
router.get('/api', async (req, res) => {
  try {
    const products = await Product.find().populate('category').lean();
    res.json(products);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách sản phẩm' });
  }
});

/**
 * ROUTE: GET /san-pham/:slug
 * Hiển thị chi tiết một sản phẩm theo slug
 * 
 * URL Parameters:
 * - slug (string): slug của sản phẩm (ví dụ: "ao-thun-den")
 * 
 * Logic:
 * - Tìm sản phẩm theo slug và isActive: true
 * - Nếu không tìm thấy, trả về lỗi 404
 * - Nếu tìm thấy, render view 'chi_tiet_san_pham' với thông tin sản phẩm
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({ slug, isActive: true }).populate('category').lean();

    if (!product) {
      return res.status(404).render('error', {
        status: 404,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    res.render('chi_tiet_san_pham', {
      title: product.name,
      product
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải chi tiết sản phẩm'
    });
  }
});

// =====================
// API CRUD SẢN PHẨM
// =====================
// Yêu cầu quyền manager/admin để tạo, cập nhật, xóa

/**
 * ROUTE: POST /san-pham/api
 * Tạo sản phẩm mới
 * 
 * Required: ensureManagerApi middleware (kiểm tra quyền quản lý)
 * 
 * Body: Các field của Product model:
 * - name (string): Tên sản phẩm
 * - description (string): Mô tả
 * - price (number): Giá gốc
 * - salePrice (number, optional): Giá bán
 * - category (string): ID danh mục
 * - slug (string): URL-friendly name
 * - tags (array): Thẻ phân loại
 * - isActive (boolean): Trạng thái hoạt động
 * 
 * Response: JSON object với sản phẩm vừa tạo
 */
router.post('/api', ensureManagerApi, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * ROUTE: GET /san-pham/api/:id
 * Lấy chi tiết một sản phẩm theo ID
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của sản phẩm
 * 
 * Response: JSON object của sản phẩm
 */
router.get('/api/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category').lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy sản phẩm' });
  }
});

/**
 * ROUTE: PUT /san-pham/api/:id
 * Cập nhật thông tin sản phẩm
 * 
 * Required: ensureManagerApi middleware (kiểm tra quyền quản lý)
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của sản phẩm
 * 
 * Body: Các field muốn cập nhật
 * 
 * Response: JSON object với sản phẩm đã cập nhật
 */
router.put('/api/:id', ensureManagerApi, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
    }
    res.json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * ROUTE: DELETE /san-pham/api/:id
 * Xóa sản phẩm khỏi database
 * 
 * Required: ensureManagerApi middleware (kiểm tra quyền quản lý)
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của sản phẩm
 * 
 * Response: JSON object với message xác nhận xóa
 */
router.delete('/api/:id', ensureManagerApi, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
    }
    res.json({ success: true, message: 'Đã xóa sản phẩm' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi xóa sản phẩm' });
  }
});

module.exports = router;
