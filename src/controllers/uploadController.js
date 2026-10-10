const fs = require('fs');
const path = require('path');
const supabaseService = require('../services/supabaseService');

/**
 * Handle Cover Image Upload
 */
const uploadImageFile = async (req, res, next) => {
  try {
    const file = req.file || (req.files && (req.files.image?.[0] || req.files[0]));
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded.'
      });
    }

    let finalUrl = `/uploads/covers/${file.filename}`;
    let storageProvider = 'local';
    let storagePath = null;

    // Try Supabase Storage upload to 'book-covers' bucket
    try {
      const supabaseResult = await supabaseService.uploadCoverImage(
        file.path,
        file.originalname,
        file.mimetype
      );
      if (supabaseResult && supabaseResult.success && supabaseResult.url) {
        finalUrl = supabaseResult.url;
        storagePath = supabaseResult.storagePath;
        storageProvider = 'supabase';
        // Clean up temporary local file if cloud upload succeeded
        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch {}
      }
    } catch (e) {
      console.warn('[Upload] Supabase image upload fallback to local covers:', e.message);
    }

    res.status(200).json({
      success: true,
      message: 'Cover image uploaded successfully.',
      filename: file.filename,
      url: finalUrl,
      storagePath,
      storage: storageProvider,
      size: file.size,
      mimetype: file.mimetype
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle PDF E-Book Upload for Admin Panel
 * Strictly uploads to Supabase Storage private 'ebooks' bucket under 'books/'
 * Removes silent local fallback and returns meaningful error if upload fails
 */
const uploadPdfFile = async (req, res, next) => {
  const file = req.file || (req.files && (req.files.pdf?.[0] || req.files.pdfFile?.[0] || req.files.file?.[0] || (Array.isArray(req.files) ? req.files[0] : null)));

  if (!file) {
    return res.status(400).json({
      success: false,
      message: 'No PDF file uploaded. Please select a valid .pdf file to upload.'
    });
  }

  const localFilePath = file.path;

  try {
    // Upload directly to Supabase Storage ('ebooks' bucket -> 'books/')
    const supabaseResult = await supabaseService.uploadPdf(
      localFilePath,
      file.originalname,
      file.mimetype
    );

    // Clean up temporary local upload from server disk
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (cleanupErr) {
      console.warn('[Upload] Temp PDF file cleanup notice:', cleanupErr.message);
    }

    // Handle Validation or Storage Failures - NO SILENT FALLBACK
    if (!supabaseResult || !supabaseResult.success) {
      const isValidation = Boolean(supabaseResult && supabaseResult.isValidation);
      const statusCode = isValidation ? 400 : 502;
      const errorMsg = supabaseResult ? supabaseResult.error : 'Unknown storage error';

      console.error(`[Upload PDF Error] (${statusCode}): ${errorMsg}`);

      return res.status(statusCode).json({
        success: false,
        message: isValidation
          ? `PDF validation failed: ${errorMsg}`
          : `Supabase Storage upload failed: ${errorMsg}. Please verify Supabase service_role credentials and bucket configuration.`,
        error: errorMsg,
        code: isValidation ? 'INVALID_PDF' : 'STORAGE_UPLOAD_FAILED'
      });
    }

    // Success: Return Storage Object Path
    return res.status(200).json({
      success: true,
      message: 'PDF document uploaded successfully to Supabase Storage.',
      storagePath: supabaseResult.storagePath,
      url: supabaseResult.storagePath, // Compatibility with existing Admin Panel forms
      bucket: supabaseResult.bucket,
      filename: supabaseResult.filename,
      originalName: file.originalname,
      size: supabaseResult.size,
      mimetype: supabaseResult.mimeType,
      storage: 'supabase'
    });
  } catch (err) {
    // Ensure temporary file cleanup on uncaught error
    try {
      if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    } catch {}
    next(err);
  }
};

module.exports = {
  uploadImageFile,
  uploadPdfFile
};
