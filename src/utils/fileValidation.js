const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_PDF_MIMES = [
  'application/pdf',
  'application/x-pdf',
  'application/acrobat',
  'applications/vnd.pdf',
  'text/pdf'
];

/**
 * Validates a PDF file: extension, MIME type, file size, and magic bytes (%PDF)
 * @param {string} filePath - Absolute path to the file on disk
 * @param {string} originalName - Original uploaded filename
 * @param {string} mimeType - Uploaded MIME type
 * @returns {{ valid: boolean, error?: string, size?: number }}
 */
function validatePdf(filePath, originalName, mimeType) {
  // 1. Validate file extension
  const ext = path.extname(originalName || filePath || '').toLowerCase();
  if (ext !== '.pdf') {
    return {
      valid: false,
      error: `Invalid file extension '${ext}'. Only '.pdf' files are allowed.`
    };
  }

  // 2. Validate MIME type if provided
  if (mimeType) {
    const cleanMime = mimeType.toLowerCase().trim();
    if (!ALLOWED_PDF_MIMES.includes(cleanMime)) {
      return {
        valid: false,
        error: `Invalid MIME type '${mimeType}'. Expected 'application/pdf'.`
      };
    }
  }

  // 3. Check file exists and size
  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      error: 'Uploaded file could not be found on server disk.'
    };
  }

  let stats;
  try {
    stats = fs.statSync(filePath);
  } catch (err) {
    return {
      valid: false,
      error: `Failed to inspect file stats: ${err.message}`
    };
  }

  if (stats.size === 0) {
    return {
      valid: false,
      error: 'Uploaded PDF is empty (0 bytes).'
    };
  }

  if (stats.size > MAX_PDF_SIZE_BYTES) {
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowed limit of 50 MB.`
    };
  }

  // 4. Magic bytes validation (PDF file signature must start with %PDF)
  try {
    const fd = fs.openSync(filePath, 'r');
    const headerBuffer = Buffer.alloc(5);
    fs.readSync(fd, headerBuffer, 0, 5, 0);
    fs.closeSync(fd);

    const header = headerBuffer.toString('ascii');
    if (!header.startsWith('%PDF')) {
      return {
        valid: false,
        error: `Invalid file signature: File header does not match a valid PDF (%PDF). Uploaded file may be renamed or corrupted.`
      };
    }
  } catch (err) {
    return {
      valid: false,
      error: `Failed to verify PDF signature: ${err.message}`
    };
  }

  return {
    valid: true,
    size: stats.size
  };
}

/**
 * Generates a clean, unique filename for storage
 * @param {string} originalName 
 * @param {string} prefix 
 * @returns {string}
 */
function generateSecureFileName(originalName, prefix = '') {
  const ext = path.extname(originalName || '').toLowerCase() || '.pdf';
  const rawBase = path.basename(originalName || 'file', ext);
  const cleanBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  const timestamp = Date.now();
  const pre = prefix ? `${prefix}_` : '';
  return `${pre}${timestamp}_${randomSuffix}_${cleanBase}${ext}`;
}

module.exports = {
  validatePdf,
  generateSecureFileName,
  MAX_PDF_SIZE_BYTES
};
