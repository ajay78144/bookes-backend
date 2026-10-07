const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    id: { type: Number, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, lowercase: true, trim: true },
    author: { type: String, default: 'Admin' },
    category: { type: String, default: 'Books' },
    content: { type: String, required: true },
    excerpt: { type: String, default: '' },
    image: { type: String, default: '' },
    published: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

const Blog = mongoose.models.Blog || mongoose.model('Blog', blogSchema);
module.exports = Blog;
