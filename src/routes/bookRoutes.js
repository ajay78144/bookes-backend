const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { bookFilesUpload } = require('../middleware/upload');

// Public catalog routes
router.get('/', bookController.getBooks);
router.get('/:id', bookController.getBookById);

// Secure paid access route (short-lived signed URL for authenticated & purchased users)
router.get('/:id/access', authenticate, bookController.getBookAccess);
router.get('/:id/signed-url', authenticate, bookController.getBookAccess);

// Admin-only management routes
router.post('/', authenticate, requireAdmin, bookFilesUpload, bookController.createBook);
router.put('/:id', authenticate, requireAdmin, bookFilesUpload, bookController.updateBook);
router.delete('/:id', authenticate, requireAdmin, bookController.deleteBook);

module.exports = router;
