/**
 * Modular Book Model Schema Definition
 */
class BookModel {
  static schema = {
    id: { type: 'Number', primaryKey: true },
    title: { type: 'String', required: true },
    author: { type: 'String', required: true },
    description: { type: 'String', default: '' },
    priceUSD: { type: 'Number', default: 0 },
    priceINR: { type: 'Number', default: 0 },
    category: { type: 'String', default: 'General' },
    genre: { type: 'String', default: '' },
    image: { type: 'String', default: '' },
    pdfUrl: { type: 'String', default: '' },
    stock: { type: 'Number', default: 999 },
    featured: { type: 'Boolean', default: false },
    rating: { type: 'Number', default: 5 },
    createdAt: { type: 'Date', default: () => new Date().toISOString() }
  };
}

module.exports = BookModel;
