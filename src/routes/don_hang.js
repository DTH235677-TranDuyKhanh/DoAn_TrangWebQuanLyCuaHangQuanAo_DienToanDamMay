// Router giỏ hàng và đơn hàng: lưu session, thêm sản phẩm, thanh toán và API đơn hàng.
const express = require('express');
const router = express.Router();
const { Order, Product } = require('../models/cac_model');

// Lấy giỏ hàng từ session. Nếu chưa tồn tại, khởi tạo giá trị mặc định.
function getCart(req) {
  return req.session.cart || { items: [], totalPrice: 0 };
}

// Tính tổng tiền của giỏ hàng và cập nhật tổng giá trị mỗi item.
function calculateCart(cart) {
  let totalPrice = 0;
  cart.items.forEach((item) => {
    item.total = item.price * item.quantity;
    totalPrice += item.total;
  });
  cart.totalPrice = totalPrice;
}

// Hiển thị trang giỏ hàng.
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

// Thêm sản phẩm vào giỏ hàng và lưu lại trong session.
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

// Hiển thị trang thanh toán nếu giỏ hàng không trống.
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

// Xử lý thanh toán và lưu đơn hàng.
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

// API CRUD đơn hàng để quản lý dữ liệu.
router.get('/api', async (req, res) => {
  try {
    const orders = await Order.find().populate('user items.product').lean();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách đơn hàng' });
  }
});

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
