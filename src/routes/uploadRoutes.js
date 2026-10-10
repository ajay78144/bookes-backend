const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { uploadImage, uploadPdf } = require('../middleware/upload');

// Image upload (5MB max)
router.post(
  '/image',
  authenticate,
  requireAdmin,
  (req, res, next) => {
    uploadImage.fields([
      { name: 'image', maxCount: 1 },
      { name: 'cover', maxCount: 1 },
      { name: 'file', maxCount: 1 }
    ])(req, res, (err) => {
      if (err) return next(err);
      if (!req.file && req.files) {
        req.file = req.files.image?.[0] || req.files.cover?.[0] || req.files.file?.[0] || null;
      }
      next();
    });
  },
  uploadController.uploadImageFile
);

// PDF upload (50MB max) - supports 'pdf', 'pdfFile', or 'file' form field from Angular Admin Panel
router.post(
  '/pdf',
  authenticate,
  requireAdmin,
  (req, res, next) => {
    uploadPdf.fields([
      { name: 'pdf', maxCount: 1 },
      { name: 'pdfFile', maxCount: 1 },
      { name: 'file', maxCount: 1 }
    ])(req, res, (err) => {
      if (err) return next(err);
      if (!req.file && req.files) {
        req.file = req.files.pdf?.[0] || req.files.pdfFile?.[0] || req.files.file?.[0] || null;
      }
      next();
    });
  },
  uploadController.uploadPdfFile
);

module.exports = router;
