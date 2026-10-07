const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema(
  {
    id: { type: Number, index: true },
    countryCode: { type: String, required: true, uppercase: true, trim: true },
    countryName: { type: String, required: true },
    currency: { type: String, required: true, uppercase: true },
    multiplier: { type: Number, default: 1.0 },
    taxRate: { type: Number, default: 0 },
    active: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

const PricingRule = mongoose.models.PricingRule || mongoose.model('PricingRule', pricingRuleSchema);
module.exports = PricingRule;
