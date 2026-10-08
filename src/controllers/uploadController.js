const path = require('path');
const supabaseService = require('../services/supabaseService');

const uploadImageFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded.'
      });
    }

    let finalUrl = `/uploads/covers/${req.file.filename}`;
    let storageProvider = 'local';

    // Try Supabase Storage upload
    try {
      const supabaseResult = await supabaseService.uploadCoverImage(
        req.file.path,
        req.file.originalname,
        req.file.mimetype
      );
      if (supabaseResult && supabaseResult.success && supabaseResult.url) {
        finalUrl = supabaseResult.url;
        storageProvider = 'supabase';
      }
    } catch (e) {
      console.warn('[Upload] Supabase image upload fallback to local:', e.message);
    }

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully.',
      filename: req.file.filename,
      url: finalUrl,
      storage: storageProvider,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    next(err);
  }
};

const uploadPdfFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No PDF file uploaded.'
      });
    }

    let finalUrl = `/uploads/pdfs/${req.file.filename}`;
    let storageProvider = 'local';

    // Upload to Supabase Storage
    try {
      const supabaseResult = await supabaseService.uploadPdf(
        req.file.path,
        req.file.originalname,
        req.file.mimetype
      );
      if (supabaseResult && supabaseResult.success && supabaseResult.url) {
        finalUrl = supabaseResult.url;
        storageProvider = 'supabase';
      } else if (supabaseResult && supabaseResult.error) {
        console.warn('[Upload] Supabase PDF upload notice:', supabaseResult.error);
      }
    } catch (e) {
      console.warn('[Upload] Supabase PDF upload fallback to local:', e.message);
    }

    res.status(200).json({
      success: true,
      message: 'PDF document uploaded successfully.',
      filename: req.file.filename,
      url: finalUrl,
      storage: storageProvider,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadImageFile,
  uploadPdfFile
};
