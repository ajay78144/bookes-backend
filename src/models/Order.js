const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    id: { type: Number, index: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    customerPhone: { type: String, default: '' },
    customerAddress: { type: String, default: '' },
    customerCountry: { type: String, default: 'IN' },
    items: [
      {
        id: { type: Number },
        title: { type: String },
        author: { type: String },
        price: { type: Number },
        qty: { type: Number, default: 1 },
        image: { type: String, default: '' }
      }
    ],
    amount: { type: Number, required: true },
    amountInPaise: { type: Number },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['pending', 'pending_payment', 'paid', 'completed', 'processing', 'shipped', 'delivered', 'failed', 'refunded', 'partially_refunded', 'cancelled'],
      default: 'pending_payment'
    },
    paymentMethod: { type: String, default: 'razorpay' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending'
    },
    razorpay_order_id: { type: String, index: true },
    razorpay_payment_id: { type: String, index: true },
    razorpay_signature: { type: String },
    receipt: { type: String },
    licenses: [
      {
        bookId: { type: Number },
        title: { type: String },
        licenseKey: { type: String },
        unlockedAt: { type: Date, default: Date.now }
      }
    ],
    refundDetails: {
      refundId: { type: String },
      amount: { type: Number },
      reason: { type: String },
      refundedAt: { type: Date }
    },
    userId: { type: Number, default: null },
    completedAt: { type: Date }
  },
  {
    timestamps: true
  }
);

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
module.exports = Order;
