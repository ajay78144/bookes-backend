const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    id: { type: Number, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'customer'], default: 'customer' },
    country: { type: String, default: 'IN' },
    currency: { type: String, default: 'INR' },
    phone: { type: String, default: '' },
    library: [{ type: Number }],
    licenses: [
      {
        bookId: { type: Number },
        title: { type: String },
        licenseKey: { type: String },
        unlockedAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;
