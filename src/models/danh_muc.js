const mongoose = require('mongoose');
const { Schema } = mongoose;

// Schema danh mục chứa tên, slug và quan hệ cha-con.
const CategorySchema = new Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, trim: true, unique: true },
  description: { type: String, trim: true },
  parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  image: { type: String, trim: true, default: '' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Category', CategorySchema);
