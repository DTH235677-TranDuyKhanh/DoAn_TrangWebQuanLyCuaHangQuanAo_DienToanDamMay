// Export tất cả model dùng trong ứng dụng để tái sử dụng ở router.
const User = require('./nguoi_dung');
const Category = require('./danh_muc');
const Product = require('./san_pham');
const Order = require('./don_hang');
const ContactMessage = require('./thong_diep_lien_he');
const Subscription = require('./dang_ky_nhan_tin');

module.exports = {
  User,
  Category,
  Product,
  Order,
  ContactMessage,
  Subscription
};
