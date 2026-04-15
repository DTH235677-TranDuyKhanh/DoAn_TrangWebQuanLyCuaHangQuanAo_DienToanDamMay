const express = require('express');
const router = express.Router();
const { Product, Category } = require('../models/cac_model');
const { ensureManagerApi } = require('../utils/auth');

// Danh sách sản phẩm công khai.
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

// API: lấy danh sách sản phẩm với thông tin category.
// Đặt trước route /:slug để tránh trùng URL với slug "api".
router.get('/api', async (req, res) => {
  try {
    const products = await Product.find().populate('category').lean();
    res.json(products);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách sản phẩm' });
  }
});

// Chi tiết sản phẩm theo slug.
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

// API CRUD sản phẩm (yêu cầu quyền manager/admin để tạo, cập nhật, xóa).
router.post('/api', ensureManagerApi, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

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
