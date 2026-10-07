const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { uploadImage, uploadPdf } = require('../middleware/upload');

// Image upload (5MB max)
router.post('/image', authenticate, requireAdmin, uploadImage.single('image'), uploadController.uploadImageFile);

// PDF upload (50MB max)
router.post('/pdf', authenticate, requireAdmin, uploadPdf.single('pdf'), uploadController.uploadPdfFile);

module.exports = router;
