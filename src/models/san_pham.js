const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProductSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, unique: true },
  description: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, min: 0 },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: String, trim: true },
  images: [{ type: String, trim: true }],
  sizes: [{ type: String, trim: true }],
  colors: [{ type: String, trim: true }],
  stock: { type: Number, default: 0, min: 0 },
  featured: { type: Boolean, default: false },
  tags: [{ type: String, trim: true }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ProductSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Product', ProductSchema);
