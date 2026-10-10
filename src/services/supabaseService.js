const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const { validatePdf, generateSecureFileName } = require('../utils/fileValidation');

let supabase = null;
let clientInitialized = false;

/**
 * Initializes and returns the Supabase client
 * Uses server-side secret / service_role key to bypass RLS policies on private buckets
 */
const getSupabaseClient = () => {
  if (supabase) return supabase;

  const url = config.supabase.url;
  const key = config.supabase.serviceRoleKey || config.supabase.key;

  if (!url || !key) {
    console.warn('[Supabase] Missing SUPABASE_URL or Supabase Key. Client cannot be initialized.');
    return null;
  }

  const isServiceRole = Boolean(
    config.supabase.serviceRoleKey &&
    key === config.supabase.serviceRoleKey
  );

  supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  if (!clientInitialized) {
    if (isServiceRole) {
      console.log(`🔒 [Supabase] Server client initialized with service_role secret privileges (URL: ${url}).`);
    } else {
      console.warn(`⚠️ [Supabase Warning] Server running with publishable/anon key. Accessing private buckets or bypassing RLS requires SUPABASE_SERVICE_ROLE_KEY.`);
    }
    clientInitialized = true;
  }

  return supabase;
};

/**
 * Upload a PDF file to private Supabase Storage bucket ('ebooks' -> 'books/')
 * @param {string} localFilePath - Path to temporary file on disk
 * @param {string} originalName - Original uploaded filename
 * @param {string} mimeType - Uploaded MIME type
 * @returns {Promise<{ success: boolean, storagePath?: string, bucket?: string, filename?: string, size?: number, error?: string, isValidation?: boolean }>}
 */
const uploadPdf = async (localFilePath, originalName, mimeType = 'application/pdf') => {
  // 1. Strict PDF validation (MIME, extension, size, %PDF magic bytes)
  const validation = validatePdf(localFilePath, originalName, mimeType);
  if (!validation.valid) {
    console.warn('[Supabase PDF Upload] Validation failed:', validation.error);
    return {
      success: false,
      error: validation.error,
      isValidation: true
    };
  }

  // 2. Ensure Supabase client is available
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Supabase credentials missing on server. Please configure SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL.'
    };
  }

  const bucket = config.supabase.bucket || 'ebooks';
  const uniqueFileName = generateSecureFileName(originalName, 'book');
  // Store PDFs strictly under 'books/' inside 'ebooks' bucket
  const storagePath = `books/${uniqueFileName}`;

  try {
    const fileBuffer = fs.readFileSync(localFilePath);

    const { data, error } = await client.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType || 'application/pdf',
        upsert: false
      });

    if (error) {
      console.error(`[Supabase Storage Upload Error] Bucket: "${bucket}", Path: "${storagePath}":`, error.message || error);
      return {
        success: false,
        error: error.message || 'Supabase storage upload failed',
        statusCode: error.statusCode || error.status || 502
      };
    }

    console.log(`✅ [Supabase] PDF securely stored in private bucket "${bucket}" at path: "${storagePath}" (${validation.size} bytes).`);

    // DO NOT generate permanent public URLs for private paid PDFs
    return {
      success: true,
      storagePath,
      bucket,
      filename: uniqueFileName,
      originalName,
      size: validation.size,
      mimeType: mimeType || 'application/pdf'
    };
  } catch (err) {
    console.error('[Supabase Storage Upload Exception]:', err.message || err);
    return {
      success: false,
      error: err.message || 'Internal error during Supabase upload'
    };
  }
};

/**
 * Creates a short-lived signed URL for reading/downloading paid e-books from private bucket
 * @param {string} storagePath - Storage path (e.g. 'books/1728...pdf')
 * @param {number} expiresIn - Expiry duration in seconds (default 3600 = 1 hour)
 * @returns {Promise<{ success: boolean, signedUrl?: string, expiresIn?: number, error?: string }>}
 */
const createSignedUrl = async (storagePath, expiresIn = 3600) => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase credentials missing.' };
  }

  const bucket = config.supabase.bucket || 'ebooks';
  // Strip bucket name if prepended
  let cleanPath = (storagePath || '').trim();
  if (cleanPath.startsWith(`${bucket}/`)) {
    cleanPath = cleanPath.substring(bucket.length + 1);
  }
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }

  if (!cleanPath) {
    return { success: false, error: 'Storage object path is required.' };
  }

  try {
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(cleanPath, expiresIn);

    if (error) {
      console.error(`[Supabase Signed URL Error] Bucket: "${bucket}", Path: "${cleanPath}":`, error.message || error);
      return { success: false, error: error.message || 'Failed to generate signed download URL' };
    }

    return {
      success: true,
      signedUrl: data.signedUrl,
      expiresIn
    };
  } catch (err) {
    console.error('[Supabase Signed URL Exception]:', err.message || err);
    return { success: false, error: err.message };
  }
};

/**
 * Upload an image file (book cover) to public 'book-covers' bucket
 * Keeps private PDF bucket separate from public assets
 * @param {string} localFilePath 
 * @param {string} originalName 
 * @param {string} mimeType 
 */
const uploadCoverImage = async (localFilePath, originalName, mimeType = 'image/jpeg') => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase credentials missing.' };
  }

  const coversBucket = config.supabase.coversBucket || 'book-covers';
  const uniqueName = generateSecureFileName(originalName, 'cover');
  const storagePath = `covers/${uniqueName}`;

  try {
    const fileBuffer = fs.readFileSync(localFilePath);
    const { data, error } = await client.storage
      .from(coversBucket)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType || 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.warn(`[Supabase Cover Upload Notice] Bucket: "${coversBucket}":`, error.message || error);
      return { success: false, error: error.message };
    }

    const { data: publicData } = client.storage
      .from(coversBucket)
      .getPublicUrl(storagePath);

    return {
      success: true,
      url: publicData?.publicUrl || '',
      storagePath,
      bucket: coversBucket
    };
  } catch (err) {
    console.warn('[Supabase Cover Upload Exception]:', err.message || err);
    return { success: false, error: err.message };
  }
};

/**
 * Sync book record and storage path to Supabase database table if present
 * @param {object} bookData 
 */
const syncBookToSupabaseDb = async (bookData) => {
  const client = getSupabaseClient();
  if (!client || !bookData) return { success: false, error: 'Client or data missing' };

  try {
    const { data, error } = await client
      .from('books')
      .upsert({
        id: bookData.id,
        title: bookData.title,
        author: bookData.author,
        description: bookData.description || '',
        price_usd: bookData.priceUSD || 0,
        category: bookData.category || 'General',
        image: bookData.image || '',
        pdf_storage_path: bookData.pdfFile || '',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      // Non-blocking: log schema warning if table doesn't exist
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  getSupabaseClient,
  uploadPdf,
  createSignedUrl,
  uploadCoverImage,
  syncBookToSupabaseDb
};
