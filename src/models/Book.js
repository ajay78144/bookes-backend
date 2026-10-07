const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    id: { type: Number, index: true },
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    priceUSD: { type: Number, default: 0 },
    priceINR: { type: Number, default: 0 },
    category: { type: String, default: 'General' },
    genre: { type: String, default: '' },
    image: { type: String, default: '' },
    pdfUrl: { type: String, default: '' },
    stock: { type: Number, default: 999 },
    featured: { type: Boolean, default: false },
    onOffer: { type: Boolean, default: false },
    rating: { type: Number, default: 5 },
    reviews: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

const Book = mongoose.models.Book || mongoose.model('Book', bookSchema);
module.exports = Book;
