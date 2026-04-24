// Router giỏ hàng và đơn hàng: lưu session, thêm sản phẩm, thanh toán và API đơn hàng.
const express = require('express');
const router = express.Router();
const { Order, Product } = require('../models/cac_model');

/**
 * Lấy giỏ hàng từ session.
 * Nếu chưa tồn tại, khởi tạo giá trị mặc định { items: [], totalPrice: 0 }
 * @param {Object} req - Express request object
 * @returns {Object} Đối tượng giỏ hàng với items và totalPrice
 */
function getCart(req) {
  return req.session.cart || { items: [], totalPrice: 0 };
}

/**
 * Tính tổng tiền của giỏ hàng và cập nhật tổng giá trị mỗi item.
 * Lặp qua từng sản phẩm và tính: item.total = price * quantity
 * Sau đó cộng tất cả để được cart.totalPrice
 * @param {Object} cart - Đối tượng giỏ hàng cần tính toán
 */
function calculateCart(cart) {
  let totalPrice = 0;
  cart.items.forEach((item) => {
    item.total = item.price * item.quantity;
    totalPrice += item.total;
  });
  cart.totalPrice = totalPrice;
}

/**
 * ROUTE: GET /don-hang/gio-hang
 * Hiển thị trang giỏ hàng với danh sách sản phẩm đã thêm
 * - Lấy giỏ hàng từ session
 * - Tính toán lại tổng tiền
 * - Render view 'gio_hang' với dữ liệu giỏ hàng
 */
router.get('/gio-hang', async (req, res) => {
  try {
    const cart = getCart(req);
    calculateCart(cart);
    res.render('gio_hang', {
      title: 'Giỏ hàng',
      cart
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải giỏ hàng'
    });
  }
});

/**
 * ROUTE: POST /don-hang/gio-hang/them
 * Thêm sản phẩm vào giỏ hàng và lưu lại trong session
 * 
 * Body Parameters:
 * - productId (string): ID của sản phẩm cần thêm
 * - quantity (number, optional): Số lượng (mặc định: 1)
 * - size (string, optional): Kích thước sản phẩm
 * - color (string, optional): Màu sắc sản phẩm
 * 
 * Logic:
 * - Kiểm tra sản phẩm tồn tại trong DB
 * - Nếu item đã có trong giỏ (cùng productId, size, color) thì tăng quantity
 * - Nếu chưa có thì thêm item mới
 * - Cập nhật tổng tiền và redirect về trang giỏ hàng
 */
router.post('/gio-hang/them', async (req, res) => {
  try {
    const { productId, quantity = 1, size, color } = req.body;
    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
    }

    const cart = req.session.cart || { items: [], totalPrice: 0 };
    const existing = cart.items.find((item) => item.productId.toString() === productId.toString() && item.size === size && item.color === color);

    if (existing) {
      existing.quantity += Number(quantity);
    } else {
      cart.items.push({
        productId: product._id,
        name: product.name,
        price: product.salePrice || product.price,
        quantity: Number(quantity),
        size: size || '',
        color: color || ''
      });
    }

    calculateCart(cart);
    req.session.cart = cart;

    res.redirect('/don-hang/gio-hang');
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi thêm sản phẩm vào giỏ hàng'
    });
  }
});

/**
 * ROUTE: GET /don-hang/gio-hang/xoa/:index
 * Xóa sản phẩm khỏi giỏ hàng theo vị trí trong mảng items
 * 
 * URL Parameters:
 * - index (number): Vị trí của item cần xóa trong mảng cart.items
 * 
 * Logic:
 * - Kiểm tra chỉ số hợp lệ (0 <= index < items.length)
 * - Xóa item tại vị trí đó bằng splice()
 * - Cập nhật lại tổng tiền
 * - Redirect về trang giỏ hàng
 */
router.get('/gio-hang/xoa/:index', (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const cart = getCart(req);

    if (index >= 0 && index < cart.items.length) {
      cart.items.splice(index, 1);
      calculateCart(cart);
      req.session.cart = cart;
    }

    res.redirect('/don-hang/gio-hang');
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi xóa sản phẩm khỏi giỏ hàng'
    });
  }
});

/**
 * ROUTE: GET /don-hang/thanh-toan
 * Hiển thị trang thanh toán nếu giỏ hàng không trống
 * 
 * Kiểm tra:
 * - Giỏ hàng phải có ít nhất 1 sản phẩm
 * - Nếu trống, chuyển hướng về trang giỏ hàng với thông báo lỗi
 * - Nếu hợp lệ, render view 'thanh_toan' với dữ liệu giỏ hàng
 */
router.get('/thanh-toan', (req, res) => {
  try {
    const cart = getCart(req);
    calculateCart(cart);

    if (!cart.items.length) {
      req.session.error = 'Giỏ hàng đang trống. Vui lòng thêm sản phẩm trước khi thanh toán.';
      return res.redirect('/don-hang/gio-hang');
    }

    res.render('thanh_toan', {
      title: 'Thanh toán',
      cart
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      status: 500,
      message: 'Lỗi khi tải trang thanh toán'
    });
  }
});

/**
 * ROUTE: POST /don-hang/thanh-toan
 * Xử lý thanh toán và lưu đơn hàng vào database
 * 
 * Body Parameters:
 * - fullname (string): Họ tên người nhận
 * - street (string): Đường phố
 * - city (string): Thành phố
 * - state (string): Tỉnh/Thành phố
 * - postalCode (string): Mã bưu điện
 * - country (string): Quốc gia
 * - phone (string): Số điện thoại
 * - paymentMethod (string): Phương thức thanh toán (COD hoặc khác)
 * 
 * Kiểm tra:
 * - Giỏ hàng không được trống
 * - Người dùng phải đã đăng nhập (req.session.user)
 * 
 * Logic:
 * - Biến đổi items từ giỏ hàng thành format lưu trong DB
 * - Tạo document Order mới trong MongoDB
 * - isPaid = true nếu paymentMethod không phải COD
 * - Xóa giỏ hàng (set về trống)
 * - Redirect về trang giỏ hàng với thông báo thành công
 */
router.post('/thanh-toan', async (req, res) => {
  try {
    const cart = getCart(req);
    calculateCart(cart);

    if (!cart.items.length) {
      req.session.error = 'Giỏ hàng của bạn đang trống.';
      return res.redirect('/don-hang/gio-hang');
    }

    if (!req.session.user) {
      req.session.error = 'Vui lòng đăng nhập để hoàn tất thanh toán';
      return res.redirect('/nguoi-dung/dang-nhap');
    }

    const { fullname, street, city, state, postalCode, country, phone, paymentMethod } = req.body;
    const orderItems = cart.items.map((item) => ({
      product: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
      color: item.color
    }));

    const order = await Order.create({
      user: req.session.user.id,
      items: orderItems,
      shippingAddress: { fullname, street, city, state, postalCode, country, phone },
      paymentMethod,
      totalPrice: cart.totalPrice,
      isPaid: paymentMethod !== 'COD',
      paidAt: paymentMethod !== 'COD' ? new Date() : null
    });

    req.session.cart = { items: [], totalPrice: 0 };
    req.session.success = 'Đơn hàng đã được đặt thành công!';

    res.redirect('/don-hang/gio-hang');
  } catch (error) {
    console.error(error);
    req.session.error = error.message || 'Lỗi khi xử lý thanh toán';
    res.redirect('/don-hang/thanh-toan');
  }
});

// =====================
// API CRUD ĐƠN HÀNG
// =====================

/**
 * ROUTE: GET /don-hang/api
 * Lấy danh sách tất cả đơn hàng (với thông tin user và product đầy đủ)
 * 
 * Response: JSON array của tất cả orders
 */
router.get('/api', async (req, res) => {
  try {
    const orders = await Order.find().populate('user items.product').lean();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách đơn hàng' });
  }
});

/**
 * ROUTE: GET /don-hang/api/:id
 * Lấy chi tiết một đơn hàng cụ thể theo ID
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của đơn hàng
 * 
 * Response: JSON object của order hoặc 404 nếu không tồn tại
 */
router.get('/api/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user items.product').lean();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy đơn hàng' });
  }
});

/**
 * ROUTE: PUT /don-hang/api/:id
 * Cập nhật thông tin đơn hàng
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của đơn hàng
 * 
 * Body: Các field muốn cập nhật
 * 
 * Response: JSON object với order đã cập nhật
 */
router.put('/api/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * ROUTE: DELETE /don-hang/api/:id
 * Xóa một đơn hàng từ database
 * 
 * URL Parameters:
 * - id (string): MongoDB ID của đơn hàng cần xóa
 * 
 * Response: JSON object với message thành công hoặc 404 nếu không tồn tại
 */
router.delete('/api/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
    }
    res.json({ success: true, message: 'Đã xóa đơn hàng' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi xóa đơn hàng' });
  }
});

module.exports = router;
