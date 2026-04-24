/**
 * Router Quản Trị: Quản lý sản phẩm, danh mục và các công cụ admin
 * Tất cả route trong file này được bảo vệ bởi middleware ensureManager
 */

const express = require('express');
const router = express.Router();
const { Product, Category } = require('../models/cac_model');
const { ensureManager } = require('../utils/auth');

/**
 * Helper: Chuyển chuỗi phân tách dấu phẩy thành mảng giá trị
 * @param {string|array} value - Giá trị input
 * @returns {array} Mảng các giá trị đã được trim
 * @example
 * formatList("item1, item2, item3") => ["item1", "item2", "item3"]
 */
const formatList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

/**
 * Helper: Tạo slug từ tên để dùng trong URL
 * Chuyển thành lowercase, xóa ký tự đặc biệt, thay thế bằng dấu gạch
 * @param {string} text - Text input
 * @returns {string} Slug format
 * @example
 * createSlug("Áo Thun Trắng") => "ao-thun-trang"
 */
const createSlug = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Middleware: Bảo vệ toàn bộ route admin
 * Chỉ người dùng có role manager/admin mới có thể truy cập
 */
router.use(ensureManager);

/**
 * ROUTE: GET /admin
 * Dashboard admin: Hiển thị thống kê số sản phẩm và danh mục
 */
router.get('/', async (req, res) => {
  try {
    const productCount = await Product.countDocuments();
    const categoryCount = await Category.countDocuments();
    res.render('admin_dashboard', {
      title: 'Bảng quản lý',
      productCount,
      categoryCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải bảng quản lý.'
    });
  }
});

// =====================
// QUẢN LÝ SẢN PHẨM
// =====================

/**
 * ROUTE: GET /admin/products
 * Hiển thị danh sách tất cả sản phẩm
 */
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().populate('category').lean();
    res.render('admin_products', {
      title: 'Quản lý sản phẩm',
      products
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải danh sách sản phẩm.'
    });
  }
});

/**
 * ROUTE: GET /admin/products/new
 * Hiển thị form thêm sản phẩm mới
 */
router.get('/products/new', async (req, res) => {
  try {
    const categories = await Category.find().lean();
    res.render('admin_product_form', {
      title: 'Thêm sản phẩm',
      action: '/admin/products',
      product: {},
      categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải biểu mẫu thêm sản phẩm.'
    });
  }
});

/**
 * ROUTE: POST /admin/products
 * Tạo sản phẩm mới từ dữ liệu form
 * 
 * Body Parameters:
 * - name (string): Tên sản phẩm
 * - slug (string): URL slug (auto-generate nếu không có)
 * - description (string): Mô tả chi tiết
 * - price (number): Giá gốc
 * - salePrice (number): Giá bán (có thể thấp hơn giá gốc)
 * - category (string): ID danh mục
 * - brand (string): Thương hiệu
 * - images (string): URL hình ảnh (phân tách bằng dấu phẩy)
 * - sizes (string): Danh sách size (phân tách bằng dấu phẩy)
 * - colors (string): Danh sách màu (phân tách bằng dấu phẩy)
 * - stock (number): Số lượng tồn kho
 * - featured (checkbox): Sản phẩm nổi bật
 * - tags (string): Tags (phân tách bằng dấu phẩy)
 * - isActive (checkbox): Trạng thái hoạt động
 */
router.post('/products', async (req, res) => {
  try {
    const product = {
      name: req.body.name?.trim(),
      slug: req.body.slug?.trim() || createSlug(req.body.name),
      description: req.body.description?.trim(),
      price: Number(req.body.price) || 0,
      salePrice: Number(req.body.salePrice) || 0,
      category: req.body.category,
      brand: req.body.brand?.trim(),
      images: formatList(req.body.images),
      sizes: formatList(req.body.sizes),
      colors: formatList(req.body.colors),
      stock: Number(req.body.stock) || 0,
      featured: req.body.featured === 'on',
      tags: formatList(req.body.tags),
      isActive: req.body.isActive === 'on'
    };

    await Product.create(product);
    req.session.success = 'Đã tạo sản phẩm mới.';
    res.redirect('/admin/products');
  } catch (error) {
    console.error(error);
    req.session.error = error.message || 'Lỗi khi tạo sản phẩm.';
    res.redirect('/admin/products/new');
  }
});

/**
 * ROUTE: GET /admin/products/:id/edit
 * Hiển thị form chỉnh sửa sản phẩm
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của sản phẩm
 */
router.get('/products/:id/edit', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).render('error', {
        status: 404,
        message: 'Sản phẩm không tồn tại.'
      });
    }
    const categories = await Category.find().lean();
    res.render('admin_product_form', {
      title: 'Chỉnh sửa sản phẩm',
      action: `/admin/products/${product._id}/edit`,
      product,
      categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải biểu mẫu chỉnh sửa sản phẩm.'
    });
  }
});

/**
 * ROUTE: POST /admin/products/:id/edit
 * Cập nhật sản phẩm đã tồn tại
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của sản phẩm
 * 
 * Body: Các field muốn cập nhật (tương tự POST /admin/products)
 */
router.post('/products/:id/edit', async (req, res) => {
  try {
    const updates = {
      name: req.body.name?.trim(),
      slug: req.body.slug?.trim() || createSlug(req.body.name),
      description: req.body.description?.trim(),
      price: Number(req.body.price) || 0,
      salePrice: Number(req.body.salePrice) || 0,
      category: req.body.category,
      brand: req.body.brand?.trim(),
      images: formatList(req.body.images),
      sizes: formatList(req.body.sizes),
      colors: formatList(req.body.colors),
      stock: Number(req.body.stock) || 0,
      featured: req.body.featured === 'on',
      tags: formatList(req.body.tags),
      isActive: req.body.isActive === 'on'
    };

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!product) {
      return res.status(404).render('error', {
        status: 404,
        message: 'Sản phẩm không tồn tại.'
      });
    }

    req.session.success = 'Đã cập nhật sản phẩm.';
    res.redirect('/admin/products');
  } catch (error) {
    console.error(error);
    req.session.error = error.message || 'Lỗi khi cập nhật sản phẩm.';
    res.redirect(`/admin/products/${req.params.id}/edit`);
  }
});

/**
 * ROUTE: POST /admin/products/:id/delete
 * Xóa sản phẩm khỏi database
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của sản phẩm
 */
router.post('/products/:id/delete', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      req.session.error = 'Sản phẩm không tồn tại.';
      return res.redirect('/admin/products');
    }

    req.session.success = 'Đã xóa sản phẩm.';
    res.redirect('/admin/products');
  } catch (error) {
    console.error(error);
    req.session.error = 'Lỗi khi xóa sản phẩm.';
    res.redirect('/admin/products');
  }
});

// =====================
// QUẢN LÝ DANH MỤC
// =====================

/**
 * ROUTE: GET /admin/categories
 * Hiển thị danh sách tất cả danh mục
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().lean();
    res.render('admin_categories', {
      title: 'Quản lý danh mục',
      categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải danh sách danh mục.'
    });
  }
});

/**
 * ROUTE: GET /admin/categories/new
 * Hiển thị form thêm danh mục mới
 */
router.get('/categories/new', async (req, res) => {
  try {
    const categories = await Category.find().lean();
    res.render('admin_category_form', {
      title: 'Thêm danh mục',
      action: '/admin/categories',
      category: {},
      categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải biểu mẫu thêm danh mục.'
    });
  }
});

/**
 * ROUTE: POST /admin/categories
 * Tạo danh mục mới từ dữ liệu form
 * 
 * Body Parameters:
 * - name (string): Tên danh mục
 * - slug (string): URL slug (auto-generate nếu không có)
 * - description (string): Mô tả
 * - parent (string): ID danh mục cha (nếu là danh mục con)
 * - isActive (checkbox): Trạng thái hoạt động
 */
router.post('/categories', async (req, res) => {
  try {
    const category = {
      name: req.body.name?.trim(),
      slug: req.body.slug?.trim() || createSlug(req.body.name),
      description: req.body.description?.trim(),
      parent: req.body.parent || null,
      isActive: req.body.isActive === 'on'
    };

    await Category.create(category);
    req.session.success = 'Đã tạo danh mục mới.';
    res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    req.session.error = error.message || 'Lỗi khi tạo danh mục.';
    res.redirect('/admin/categories/new');
  }
});

/**
 * ROUTE: GET /admin/categories/:id/edit
 * Hiển thị form chỉnh sửa danh mục
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của danh mục
 */
router.get('/categories/:id/edit', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    if (!category) {
      return res.status(404).render('error', {
        status: 404,
        message: 'Danh mục không tồn tại.'
      });
    }
    const categories = await Category.find({ _id: { $ne: category._id } }).lean();
    res.render('admin_category_form', {
      title: 'Chỉnh sửa danh mục',
      action: `/admin/categories/${category._id}/edit`,
      category,
      categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải biểu mẫu chỉnh sửa danh mục.'
    });
  }
});

/**
 * ROUTE: POST /admin/categories/:id/edit
 * Cập nhật danh mục đã tồn tại
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của danh mục
 * 
 * Body: Các field muốn cập nhật (tương tự POST /admin/categories)
 */
router.post('/categories/:id/edit', async (req, res) => {
  try {
    const updates = {
      name: req.body.name?.trim(),
      slug: req.body.slug?.trim() || createSlug(req.body.name),
      description: req.body.description?.trim(),
      parent: req.body.parent || null,
      isActive: req.body.isActive === 'on'
    };

    const category = await Category.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!category) {
      return res.status(404).render('error', {
        status: 404,
        message: 'Danh mục không tồn tại.'
      });
    }

    req.session.success = 'Đã cập nhật danh mục.';
    res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    req.session.error = error.message || 'Lỗi khi cập nhật danh mục.';
    res.redirect(`/admin/categories/${req.params.id}/edit`);
  }
});

/**
 * ROUTE: POST /admin/categories/:id/delete
 * Xóa danh mục khỏi database
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của danh mục
 */
router.post('/categories/:id/delete', async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      req.session.error = 'Danh mục không tồn tại.';
      return res.redirect('/admin/categories');
    }

    req.session.success = 'Đã xóa danh mục.';
    res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    req.session.error = 'Lỗi khi xóa danh mục.';
    res.redirect('/admin/categories');
  }
});

module.exports = router;
