const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { bookFilesUpload } = require('../middleware/upload');

router.get('/', bookController.getBooks);
router.get('/:id', bookController.getBookById);
router.post('/', authenticate, requireAdmin, bookFilesUpload, bookController.createBook);
router.put('/:id', authenticate, requireAdmin, bookFilesUpload, bookController.updateBook);
router.delete('/:id', authenticate, requireAdmin, bookController.deleteBook);

module.exports = router;
