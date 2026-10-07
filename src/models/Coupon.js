const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    id: { type: Number, index: true },
    code: { type: String, required: true, uppercase: true, trim: true, unique: true },
    discountPercent: { type: Number, required: true, min: 1, max: 100 },
    minOrderUSD: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    expiryDate: { type: Date }
  },
  {
    timestamps: true
  }
);

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
