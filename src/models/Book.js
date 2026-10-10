const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    id: { type: Number, index: true },
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    priceUSD: { type: Number, default: 0 },
    originalPriceUSD: { type: Number, default: null },
    priceINR: { type: Number, default: 0 },
    // 🌍 Country-Specific Manual Prices (e.g. { "INR": 499, "IN": 499, "AUD": 45, "USD": 29.99 })
    countryPricing: { 
      type: Object, 
      default: {} 
    },
    category: { type: String, default: 'General' },
    genre: { type: String, default: '' },
    image: { type: String, default: '' },
    pdfFile: { type: String, default: '' },
    pdfUrl: { type: String, default: '' },
    samplePages: { type: Array, default: [] },
    stock: { type: Number, default: 999 },
    isFeatured: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    isSpecialOffer: { type: Boolean, default: false },
    onOffer: { type: Boolean, default: false },
    isAudiobook: { type: Boolean, default: false },
    audioUrl: { type: String, default: '' },
    rating: { type: Number, default: 5 },
    reviews: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    minimize: false
  }
);

const Book = mongoose.models.Book || mongoose.model('Book', bookSchema);
module.exports = Book;
