const db = require('../db/jsonDb');

const getBlogs = async (req, res, next) => {
  try {
    let blogs = db.getCollection('blogs');
    const { category, search, all } = req.query;

    // Filter published only for public users unless admin or explicit query with admin auth
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin && all !== 'true') {
      blogs = blogs.filter(b => b.isPublished !== false);
    }

    // Filter by Category
    if (category && category.toLowerCase() !== 'all') {
      blogs = blogs.filter(b => b.category && b.category.toLowerCase() === category.toLowerCase().trim());
    }

    // Search
    if (search) {
      const q = search.toLowerCase().trim();
      blogs = blogs.filter(b =>
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.excerpt && b.excerpt.toLowerCase().includes(q)) ||
        (b.content && b.content.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    blogs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.status(200).json({
      success: true,
      count: blogs.length,
      data: blogs
    });
  } catch (err) {
    next(err);
  }
};

const getBlogById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blog = db.findById('blogs', id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: `Blog post with ID ${id} not found.`
      });
    }

    // Increment view count
    db.update('blogs', id, { views: (blog.views || 0) + 1 });

    res.status(200).json({
      success: true,
      data: { ...blog, views: (blog.views || 0) + 1 }
    });
  } catch (err) {
    next(err);
  }
};

const createBlog = async (req, res, next) => {
  try {
    const {
      title,
      author,
      category = 'General',
      image,
      excerpt,
      content,
      tags = [],
      isPublished = true
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required fields.'
      });
    }

    let parsedTags = tags;
    if (typeof tags === 'string') {
      parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    let blogImage = image || 'images/post-img1.jpg';
    if (req.file) {
      blogImage = `/uploads/covers/${req.file.filename}`;
    }

    const now = new Date().toISOString();
    const newBlog = db.insert('blogs', {
      title: title.trim(),
      author: author ? author.trim() : (req.user ? req.user.name : 'BookSaw Editorial'),
      category: category.trim(),
      image: blogImage,
      excerpt: excerpt || (content.slice(0, 160) + '...'),
      content,
      tags: parsedTags,
      isPublished: Boolean(isPublished === true || isPublished === 'true'),
      views: 0,
      createdAt: now,
      updatedAt: now
    });

    res.status(201).json({
      success: true,
      message: 'Blog post created successfully.',
      data: newBlog
    });
  } catch (err) {
    next(err);
  }
};

const updateBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = db.findById('blogs', id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Blog post with ID ${id} not found.`
      });
    }

    const updateData = { ...req.body };

    if (req.file) {
      updateData.image = `/uploads/covers/${req.file.filename}`;
    }

    if (typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    if (updateData.isPublished !== undefined) {
      updateData.isPublished = Boolean(updateData.isPublished === true || updateData.isPublished === 'true');
    }

    const updated = db.update('blogs', id, updateData);

    res.status(200).json({
      success: true,
      message: 'Blog post updated successfully.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

const deleteBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = db.findById('blogs', id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Blog post with ID ${id} not found.`
      });
    }

    db.delete('blogs', id);

    res.status(200).json({
      success: true,
      message: `Blog post with ID ${id} deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog
};
