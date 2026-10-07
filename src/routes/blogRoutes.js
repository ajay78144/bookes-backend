const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

router.get('/', optionalAuth, blogController.getBlogs);
router.get('/:id', blogController.getBlogById);
router.post('/', authenticate, requireAdmin, uploadImage.single('image'), blogController.createBlog);
router.put('/:id', authenticate, requireAdmin, uploadImage.single('image'), blogController.updateBlog);
router.delete('/:id', authenticate, requireAdmin, blogController.deleteBlog);

module.exports = router;
