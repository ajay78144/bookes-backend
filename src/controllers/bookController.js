const fs = require('fs');
const db = require('../db/jsonDb');
const supabaseService = require('../services/supabaseService');

const getBooks = async (req, res, next) => {
  try {
    const { category, search, minPrice, maxPrice, tag, sort, page, limit } = req.query;
    let books = db.getCollection('books');

    // Filter by Category
    if (category && category.toLowerCase() !== 'all') {
      const catLower = category.toLowerCase().trim();
      books = books.filter(b => 
        (b.category && b.category.toLowerCase() === catLower) ||
        (b.genre && b.genre.toLowerCase() === catLower)
      );
    }

    // Filter by Search (title, author, description, category)
    if (search) {
      const q = search.toLowerCase().trim();
      books = books.filter(b =>
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.category && b.category.toLowerCase().includes(q)) ||
        (b.description && b.description.toLowerCase().includes(q))
      );
    }

    // Filter by Price Range (USD)
    if (minPrice !== undefined && !isNaN(Number(minPrice))) {
      books = books.filter(b => Number(b.priceUSD) >= Number(minPrice));
    }
    if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
      books = books.filter(b => Number(b.priceUSD) <= Number(maxPrice));
    }

    // Filter by Tag / Boolean Flags
    if (tag) {
      const tagLower = tag.toLowerCase().trim();
      if (tagLower === 'featured') books = books.filter(b => b.isFeatured || b.featured);
      else if (tagLower === 'bestseller' || tagLower === 'best-seller') books = books.filter(b => b.isBestSeller);
      else if (tagLower === 'popular') books = books.filter(b => b.isPopular);
      else if (tagLower === 'specialoffer' || tagLower === 'offer' || tagLower === 'special-offer') books = books.filter(b => b.isSpecialOffer || b.onOffer);
      else if (tagLower === 'audiobook' || tagLower === 'audio') books = books.filter(b => b.isAudiobook);
    }

    // Sort
    if (sort) {
      switch (sort.toLowerCase()) {
        case 'price-asc':
        case 'price_low':
          books.sort((a, b) => Number(a.priceUSD || 0) - Number(b.priceUSD || 0));
          break;
        case 'price-desc':
        case 'price_high':
          books.sort((a, b) => Number(b.priceUSD || 0) - Number(a.priceUSD || 0));
          break;
        case 'rating':
          books.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
          break;
        case 'newest':
          books.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          break;
        case 'title':
        case 'title-asc':
          books.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
          break;
        case 'popular':
        case 'reviews':
          books.sort((a, b) => Number(b.reviews || 0) - Number(a.reviews || 0));
          break;
        default:
          break;
      }
    }

    const total = books.length;

    // Optional Pagination
    if (page && limit) {
      const p = parseInt(page, 10) || 1;
      const l = parseInt(limit, 10) || 10;
      const startIndex = (p - 1) * l;
      books = books.slice(startIndex, startIndex + l);
      return res.status(200).json({
        success: true,
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
        count: books.length,
        data: books
      });
    }

    res.status(200).json({
      success: true,
      count: books.length,
      data: books
    });
  } catch (err) {
    next(err);
  }
};

const getBookById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const book = db.findById('books', id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: `Book with ID ${id} not found.`
      });
    }

    res.status(200).json({
      success: true,
      data: book
    });
  } catch (err) {
    next(err);
  }
};

const createBook = async (req, res, next) => {
  try {
    const {
      title,
      author,
      priceUSD,
      originalPriceUSD,
      category = 'General',
      rating = 5,
      reviews = 0,
      image,
      pdfFile,
      samplePages,
      isFeatured,
      isBestSeller,
      isPopular,
      isSpecialOffer,
      isAudiobook,
      audioUrl,
      description,
      stock = 100
    } = req.body;

    if (!title || !author || priceUSD === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Title, author, and priceUSD are required fields.'
      });
    }

    // Default image and pdf
    let coverUrl = image || 'images/default-book.jpg';
    let pdfUrl = pdfFile || '';

    // Check for uploaded files in multipart form
    if (req.files) {
      // 1. Cover image upload
      const imgFile = req.files.image && req.files.image[0];
      if (imgFile) {
        try {
          const supCover = await supabaseService.uploadCoverImage(
            imgFile.path,
            imgFile.originalname,
            imgFile.mimetype
          );
          if (supCover && supCover.success && supCover.url) {
            coverUrl = supCover.url;
            try { if (fs.existsSync(imgFile.path)) fs.unlinkSync(imgFile.path); } catch {}
          } else {
            coverUrl = `/uploads/covers/${imgFile.filename}`;
          }
        } catch {
          coverUrl = `/uploads/covers/${imgFile.filename}`;
        }
      }

      // 2. PDF file upload - STRICT SUPABASE UPLOAD (NO SILENT FALLBACK)
      const pdfUpload = (req.files.pdfFile && req.files.pdfFile[0]) || (req.files.pdf && req.files.pdf[0]);
      if (pdfUpload) {
        const supPdf = await supabaseService.uploadPdf(
          pdfUpload.path,
          pdfUpload.originalname,
          pdfUpload.mimetype
        );

        // Clean up temp file from server disk
        try {
          if (fs.existsSync(pdfUpload.path)) fs.unlinkSync(pdfUpload.path);
        } catch {}

        if (!supPdf || !supPdf.success) {
          const isVal = Boolean(supPdf && supPdf.isValidation);
          return res.status(isVal ? 400 : 502).json({
            success: false,
            message: `Failed to upload PDF to Supabase Storage: ${supPdf ? supPdf.error : 'Upload failed'}. Book creation aborted.`,
            error: supPdf ? supPdf.error : 'Storage upload error',
            code: isVal ? 'INVALID_PDF' : 'STORAGE_UPLOAD_FAILED'
          });
        }

        // Store the Supabase Storage object path (under 'books/')
        pdfUrl = supPdf.storagePath;
      }
    } else if (req.file) {
      coverUrl = `/uploads/covers/${req.file.filename}`;
    }

    // Parse samplePages if passed as JSON string
    let parsedSamplePages = [];
    if (typeof samplePages === 'string') {
      try {
        parsedSamplePages = JSON.parse(samplePages);
      } catch {
        parsedSamplePages = [{ pageNumber: 1, chapterTitle: 'Preview', content: samplePages }];
      }
    } else if (Array.isArray(samplePages)) {
      parsedSamplePages = samplePages;
    }

    const now = new Date().toISOString();
    const newBook = db.insert('books', {
      title: title.trim(),
      author: author.trim(),
      priceUSD: Number(priceUSD),
      originalPriceUSD: originalPriceUSD ? Number(originalPriceUSD) : null,
      category: category.trim(),
      rating: Number(rating) || 5,
      reviews: Number(reviews) || 0,
      image: coverUrl,
      pdfFile: pdfUrl,
      samplePages: parsedSamplePages,
      isFeatured: Boolean(isFeatured === true || isFeatured === 'true'),
      isBestSeller: Boolean(isBestSeller === true || isBestSeller === 'true'),
      isPopular: Boolean(isPopular === true || isPopular === 'true'),
      isSpecialOffer: Boolean(isSpecialOffer === true || isSpecialOffer === 'true'),
      isAudiobook: Boolean(isAudiobook === true || isAudiobook === 'true'),
      audioUrl: audioUrl || '',
      description: description || '',
      stock: Number(stock) || 100,
      createdAt: now,
      updatedAt: now
    });

    // Non-blocking sync metadata to Supabase DB table if table exists
    supabaseService.syncBookToSupabaseDb(newBook).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Book created successfully.',
      data: newBook
    });
  } catch (err) {
    next(err);
  }
};

const updateBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = db.findById('books', id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Book with ID ${id} not found.`
      });
    }

    const updateData = { ...req.body };

    // Format numbers
    if (updateData.priceUSD !== undefined) updateData.priceUSD = Number(updateData.priceUSD);
    if (updateData.originalPriceUSD !== undefined) updateData.originalPriceUSD = updateData.originalPriceUSD ? Number(updateData.originalPriceUSD) : null;
    if (updateData.stock !== undefined) updateData.stock = Number(updateData.stock);
    if (updateData.rating !== undefined) updateData.rating = Number(updateData.rating);
    if (updateData.reviews !== undefined) updateData.reviews = Number(updateData.reviews);

    // Format booleans
    ['isFeatured', 'isBestSeller', 'isPopular', 'isSpecialOffer', 'isAudiobook'].forEach(key => {
      if (updateData[key] !== undefined) {
        updateData[key] = Boolean(updateData[key] === true || updateData[key] === 'true');
      }
    });

    // Check for uploaded files
    if (req.files) {
      const imgFile = req.files.image && req.files.image[0];
      if (imgFile) {
        try {
          const supCover = await supabaseService.uploadCoverImage(
            imgFile.path,
            imgFile.originalname,
            imgFile.mimetype
          );
          if (supCover && supCover.success && supCover.url) {
            updateData.image = supCover.url;
            try { if (fs.existsSync(imgFile.path)) fs.unlinkSync(imgFile.path); } catch {}
          } else {
            updateData.image = `/uploads/covers/${imgFile.filename}`;
          }
        } catch {
          updateData.image = `/uploads/covers/${imgFile.filename}`;
        }
      }

      const pdfUpload = (req.files.pdfFile && req.files.pdfFile[0]) || (req.files.pdf && req.files.pdf[0]);
      if (pdfUpload) {
        const supPdf = await supabaseService.uploadPdf(
          pdfUpload.path,
          pdfUpload.originalname,
          pdfUpload.mimetype
        );

        // Clean up temp file
        try {
          if (fs.existsSync(pdfUpload.path)) fs.unlinkSync(pdfUpload.path);
        } catch {}

        if (!supPdf || !supPdf.success) {
          const isVal = Boolean(supPdf && supPdf.isValidation);
          return res.status(isVal ? 400 : 502).json({
            success: false,
            message: `Failed to upload PDF to Supabase Storage: ${supPdf ? supPdf.error : 'Upload failed'}. Book update aborted.`,
            error: supPdf ? supPdf.error : 'Storage upload error',
            code: isVal ? 'INVALID_PDF' : 'STORAGE_UPLOAD_FAILED'
          });
        }

        updateData.pdfFile = supPdf.storagePath;
      }
    } else if (req.file) {
      updateData.image = `/uploads/covers/${req.file.filename}`;
    }

    // Parse samplePages if passed as JSON string
    if (typeof updateData.samplePages === 'string') {
      try {
        updateData.samplePages = JSON.parse(updateData.samplePages);
      } catch {}
    }

    const updated = db.update('books', id, updateData);

    // Sync metadata to Supabase DB table
    supabaseService.syncBookToSupabaseDb(updated).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Book updated successfully.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

const deleteBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = db.findById('books', id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Book with ID ${id} not found.`
      });
    }

    db.delete('books', id);

    res.status(200).json({
      success: true,
      message: `Book with ID ${id} deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Secure Access to Paid E-Book PDF
 * Generates short-lived signed URL only for authorized users (Admin or Purchased Customer)
 */
const getBookAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const book = db.findById('books', id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: `Book with ID ${id} not found.`
      });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to access paid e-books.'
      });
    }

    // 1. Authorization check: Admin OR purchased customer
    let isAuthorized = false;
    if (user.role === 'admin') {
      isAuthorized = true;
    } else {
      const numId = Number(id);
      const userLibrary = Array.isArray(user.library) ? user.library.map(Number) : [];
      if (userLibrary.includes(numId)) {
        isAuthorized = true;
      } else {
        // Check confirmed orders
        const orders = db.getCollection('orders');
        const userOrders = orders.filter(o => 
          (String(o.userId) === String(user.id) || (o.customerEmail && o.customerEmail.toLowerCase() === user.email.toLowerCase())) &&
          (o.status === 'completed' || o.paymentStatus === 'paid')
        );
        for (const order of userOrders) {
          const items = Array.isArray(order.items) ? order.items : [];
          if (items.some(it => Number(it.id || it.bookId) === numId)) {
            isAuthorized = true;
            break;
          }
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You have not purchased this e-book. Please complete purchase to read or download.',
        code: 'ACCESS_DENIED'
      });
    }

    const rawPdf = (book.pdfFile || book.pdfUrl || '').trim();
    if (!rawPdf) {
      return res.status(404).json({
        success: false,
        message: 'No PDF document is associated with this book.'
      });
    }

    // Supabase Storage path: generate secure signed URL (1 hour expiry)
    if (rawPdf.startsWith('books/') || (!rawPdf.startsWith('/uploads') && !rawPdf.startsWith('http'))) {
      const signedResult = await supabaseService.createSignedUrl(rawPdf, 3600);
      if (signedResult && signedResult.success && signedResult.signedUrl) {
        return res.status(200).json({
          success: true,
          accessType: 'signed-url',
          signedUrl: signedResult.signedUrl,
          expiresIn: 3600,
          storagePath: rawPdf,
          book: {
            id: book.id,
            title: book.title,
            author: book.author
          }
        });
      } else {
        return res.status(502).json({
          success: false,
          message: `Failed to generate secure signed URL from Supabase Storage: ${signedResult ? signedResult.error : 'Storage error'}`
        });
      }
    }

    // Legacy local storage file
    return res.status(200).json({
      success: true,
      accessType: 'direct',
      url: rawPdf,
      legacy: true,
      book: {
        id: book.id,
        title: book.title,
        author: book.author
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  getBookAccess
};
