const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

let supabase = null;

const getSupabaseClient = () => {
  if (!supabase && config.supabase.url && config.supabase.key) {
    supabase = createClient(config.supabase.url, config.supabase.key, {
      auth: {
        persistSession: false
      }
    });
  }
  return supabase;
};

/**
 * Upload a PDF file to Supabase Storage
 * @param {string} localFilePath - Local absolute path to the uploaded file on disk
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File mimetype (default: application/pdf)
 * @returns {Promise<{success: boolean, url: string, path?: string, error?: string}>}
 */
const uploadPdf = async (localFilePath, originalName, mimeType = 'application/pdf') => {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('[Supabase] Client not initialized. Missing URL or KEY.');
    return { success: false, error: 'Supabase credentials missing' };
  }

  const bucket = config.supabase.bucket || 'ebooks';
  const ext = path.extname(originalName || localFilePath).toLowerCase() || '.pdf';
  const baseName = path.basename(originalName || localFilePath, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `pdfs/${Date.now()}_${baseName}${ext}`;

  try {
    const fileBuffer = fs.readFileSync(localFilePath);
    const { data, error } = await client.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      console.error('[Supabase Storage Upload Error]:', error.message || error);
      return {
        success: false,
        error: error.message || 'Supabase upload failed'
      };
    }

    const { data: publicData } = client.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    const publicUrl = publicData ? publicData.publicUrl : '';
    console.log(`[Supabase] PDF uploaded successfully: ${publicUrl}`);

    return {
      success: true,
      url: publicUrl,
      storagePath,
      bucket
    };
  } catch (err) {
    console.error('[Supabase Exception]:', err.message || err);
    return {
      success: false,
      error: err.message
    };
  }
};

/**
 * Upload an image file (book cover) to Supabase Storage
 * @param {string} localFilePath 
 * @param {string} originalName 
 * @param {string} mimeType 
 */
const uploadCoverImage = async (localFilePath, originalName, mimeType = 'image/jpeg') => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase credentials missing' };
  }

  const bucket = config.supabase.bucket || 'ebooks';
  const ext = path.extname(originalName || localFilePath).toLowerCase() || '.jpg';
  const baseName = path.basename(originalName || localFilePath, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `covers/${Date.now()}_${baseName}${ext}`;

  try {
    const fileBuffer = fs.readFileSync(localFilePath);
    const { data, error } = await client.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      console.error('[Supabase Image Upload Error]:', error.message || error);
      return { success: false, error: error.message };
    }

    const { data: publicData } = client.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    return {
      success: true,
      url: publicData?.publicUrl || '',
      storagePath,
      bucket
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  getSupabaseClient,
  uploadPdf,
  uploadCoverImage
};
