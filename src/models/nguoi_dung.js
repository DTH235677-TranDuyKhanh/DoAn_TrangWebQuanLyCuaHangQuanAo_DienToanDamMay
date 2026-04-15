const mongoose = require('mongoose');
const { Schema } = mongoose;

// Schema người dùng lưu thông tin đăng nhập và hồ sơ.
const UserSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  googleId: { type: String, trim: true, default: null },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'employee', 'manager', 'admin'], default: 'customer' },
  phone: { type: String, trim: true },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Cập nhật thời gian sửa mỗi lần save.
UserSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('User', UserSchema);
