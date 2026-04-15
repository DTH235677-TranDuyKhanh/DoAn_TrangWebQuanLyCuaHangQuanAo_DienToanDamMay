const mongoose = require('mongoose');
const { Schema } = mongoose;

// Schema đăng ký nhận tin: lưu email và trạng thái đăng ký.
const SubscriptionSchema = new Schema({
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  source: { type: String, trim: true, default: 'website' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);
