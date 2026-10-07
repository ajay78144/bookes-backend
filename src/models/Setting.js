const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    siteName: { type: String, default: 'BookSaw' },
    siteTagline: { type: String, default: 'Instant PDF E-Books & Online Digital Reader' },
    defaultCurrency: { type: String, default: 'INR' },
    taxRate: { type: Number, default: 5 },
    shippingFee: { type: Number, default: 0 },
    freeShippingAbove: { type: Number, default: 500 },
    razorpay: {
      enabled: { type: Boolean, default: true },
      mode: { type: String, enum: ['test', 'live'], default: 'test' },
      keyId: { type: String, default: '' },
      keySecret: { type: String, default: '' },
      webhookSecret: { type: String, default: '' },
      currency: { type: String, default: 'INR' },
      storeName: { type: String, default: 'BookSaw E-Books' },
      updatedAt: { type: Date }
    },
    exchangeRates: { type: Map, of: Number, default: {} },
    lastSyncTime: { type: Date }
  },
  {
    timestamps: true
  }
);

const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);
module.exports = Setting;
