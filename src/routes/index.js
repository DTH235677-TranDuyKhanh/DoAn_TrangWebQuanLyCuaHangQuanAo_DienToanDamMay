const express = require('express');

const router = express.Router();

const trangChuRouter = require('./trang_chu');
const sanPhamRouter = require('./san_pham');
const danhMucRouter = require('./danh_muc');
const nguoiDungRouter = require('./nguoi_dung');
const donHangRouter = require('./don_hang');
const lienHeRouter = require('./lien_he');
const adminRouter = require('./admin');

// Mount các cụm route chính của ứng dụng.
// Các route con sẽ tiếp tục định nghĩa các URL riêng biệt.
router.use('/', trangChuRouter);
router.use('/san-pham', sanPhamRouter);
router.use('/danh-muc', danhMucRouter);
router.use('/nguoi-dung', nguoiDungRouter);
router.use('/don-hang', donHangRouter);
router.use('/lien-he', lienHeRouter);
router.use('/admin', adminRouter);

module.exports = router;
