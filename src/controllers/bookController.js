const fs = require('fs');
const mongoose = require('mongoose');
const db = require('../db/jsonDb');
const supabaseService = require('../services/supabaseService');

/**
 * Helper to enrich book with country pricing and resolve current currency if requested
 */
const enrichBookWithPricing = (book, req) => {
  if (!book) return book;
  const currencyParam = (req.query?.currency || req.headers?.['x-currency'] || '').toUpperCase().trim();
  const countryParam = (req.query?.country || req.headers?.['x-country'] || '').toUpperCase().trim();

  const countryPricing = (book.countryPricing && typeof book.countryPricing === 'object') ? { ...book.countryPricing } : {};

  let targetPrice = null;
  let targetCurrency = null;
  let isManualPrice = false;

  if (currencyParam) {
    if (countryPricing[currencyParam] !== undefined && !isNaN(Number(countryPricing[currencyParam]))) {
      targetPrice = Number(countryPricing[currencyParam]);
      targetCurrency = currencyParam;
      isManualPrice = true;
    }
  } else if (countryParam) {
    if (countryPricing[countryParam] !== undefined && !isNaN(Number(countryPricing[countryParam]))) {
      targetPrice = Number(countryPricing[countryParam]);
      targetCurrency = countryParam;
      isManualPrice = true;
    }
  }

  const baseUSD = book.priceUSD !== undefined ? Number(book.priceUSD) : (book.price !== undefined ? Number(book.price) : 0);
  const baseINR = book.priceINR !== undefined ? Number(book.priceINR) : (countryPricing['INR'] !== undefined ? Number(countryPricing['INR']) : Math.round(baseUSD * 83.5));

  return {
    ...book,
    price: baseUSD,
    priceUSD: baseUSD,
    priceINR: baseINR,
    countryPricing,
    ...(targetPrice !== null ? {
      currentPrice: targetPrice,
      currentCurrency: targetCurrency,
      isManualPrice
    } : {})
  };
};

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
      const sliced = books.slice(startIndex, startIndex + l);
      return res.status(200).json({
        success: true,
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
        count: sliced.length,
        data: sliced.map(b => enrichBookWithPricing(b, req))
      });
    }

    res.status(200).json({
      success: true,
      count: books.length,
      data: books.map(b => enrichBookWithPricing(b, req))
    });
  } catch (err) {
    next(err);
  }
};

const getBookById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let book = db.findById('books', id);

    // Fallback: Check MongoDB Atlas directly if not found in local JSON
    if (!book && mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const coll = mongoose.connection.db.collection('books');
        const numId = Number(id);
        const strId = String(id);
        const conditions = [];
        if (!isNaN(numId)) conditions.push({ id: numId });
        conditions.push({ id: strId });
        if (mongoose.Types.ObjectId.isValid(strId) && strId.length === 24) {
          conditions.push({ _id: new mongoose.Types.ObjectId(strId) });
        }
        const mDoc = await coll.findOne(conditions.length === 1 ? conditions[0] : { $or: conditions });
        if (mDoc) {
          const { _id, ...rest } = mDoc;
          book = db.insert('books', { ...rest, id: rest.id !== undefined ? rest.id : _id.toString() });
        }
      } catch (e) {
        console.warn('MongoDB fallback getBookById error:', e.message);
      }
    }

    if (!book) {
      return res.status(404).json({
        success: false,
        message: `Book with ID ${id} not found.`
      });
    }

    res.status(200).json({
      success: true,
      data: enrichBookWithPricing(book, req)
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
      price,
      priceINR,
      originalPriceUSD,
      originalPrice,
      countryPricing: rawCountryPricing,
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

    // Flexible price resolution
    let finalPriceUSD = (priceUSD !== undefined && priceUSD !== '') ? Number(priceUSD) : undefined;
    let finalPriceINR = (priceINR !== undefined && priceINR !== '') ? Number(priceINR) : undefined;

    if (finalPriceUSD === undefined && price !== undefined && price !== '') {
      const p = Number(price);
      if (!isNaN(p)) {
        if (p > 100) {
          finalPriceINR = p;
          finalPriceUSD = Number((p / 83.5).toFixed(2));
        } else {
          finalPriceUSD = p;
          finalPriceINR = Math.round(p * 83.5);
        }
      }
    }

    if (!title || !author || (finalPriceUSD === undefined && finalPriceINR === undefined)) {
      return res.status(400).json({
        success: false,
        message: 'Title, author, and price are required fields.'
      });
    }

    if (finalPriceUSD === undefined && finalPriceINR !== undefined) {
      finalPriceUSD = Number((finalPriceINR / 83.5).toFixed(2));
    }
    if (finalPriceINR === undefined && finalPriceUSD !== undefined) {
      finalPriceINR = Math.round(finalPriceUSD * 83.5);
    }

    // Parse and sanitize countryPricing
    let parsedCountryPricing = {};
    if (typeof rawCountryPricing === 'string') {
      try {
        parsedCountryPricing = JSON.parse(rawCountryPricing);
      } catch {
        parsedCountryPricing = {};
      }
    } else if (typeof rawCountryPricing === 'object' && rawCountryPricing !== null) {
      parsedCountryPricing = rawCountryPricing;
    }

    const cleanCountryPricing = {};
    Object.keys(parsedCountryPricing).forEach(k => {
      const num = Number(parsedCountryPricing[k]);
      if (!isNaN(num) && num >= 0) {
        cleanCountryPricing[k.toUpperCase().trim()] = num;
      }
    });

    // Ensure INR and USD are registered in countryPricing
    if (finalPriceINR !== undefined && cleanCountryPricing['INR'] === undefined) {
      cleanCountryPricing['INR'] = finalPriceINR;
      cleanCountryPricing['IN'] = finalPriceINR;
    }
    if (finalPriceUSD !== undefined && cleanCountryPricing['USD'] === undefined) {
      cleanCountryPricing['USD'] = finalPriceUSD;
      cleanCountryPricing['US'] = finalPriceUSD;
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

    const finalOrigPrice = originalPriceUSD !== undefined ? Number(originalPriceUSD) : (originalPrice !== undefined ? Number(originalPrice) : null);

    const now = new Date().toISOString();
    const newBook = db.insert('books', {
      title: title.trim(),
      author: author.trim(),
      price: finalPriceUSD,
      priceUSD: finalPriceUSD,
      originalPriceUSD: finalOrigPrice,
      priceINR: finalPriceINR,
      countryPricing: cleanCountryPricing,
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
      data: enrichBookWithPricing(newBook, req)
    });
  } catch (err) {
    next(err);
  }
};

const updateBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    let existing = db.findById('books', id);

    // Fallback: Check MongoDB Atlas directly if not found in local JSON
    if (!existing && mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const coll = mongoose.connection.db.collection('books');
        const numId = Number(id);
        const strId = String(id);
        const conditions = [];
        if (!isNaN(numId)) conditions.push({ id: numId });
        conditions.push({ id: strId });
        if (mongoose.Types.ObjectId.isValid(strId) && strId.length === 24) {
          conditions.push({ _id: new mongoose.Types.ObjectId(strId) });
        }
        const mDoc = await coll.findOne(conditions.length === 1 ? conditions[0] : { $or: conditions });
        if (mDoc) {
          const { _id, ...rest } = mDoc;
          existing = db.insert('books', { ...rest, id: rest.id !== undefined ? rest.id : _id.toString() });
        }
      } catch (e) {
        console.warn('MongoDB fallback updateBook error:', e.message);
      }
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Book with ID ${id} not found.`
      });
    }

    const updateData = { ...req.body };

    // 1. Flexible Price Resolution: handles 'price', 'priceUSD', 'priceINR'
    const incomingPrice = updateData.priceUSD !== undefined && updateData.priceUSD !== '' ? updateData.priceUSD : updateData.price;
    if (incomingPrice !== undefined && incomingPrice !== '') {
      const p = Number(incomingPrice);
      if (!isNaN(p)) {
        if (p > 100) {
          // Indian Rupee / local currency scale
          updateData.priceINR = p;
          if (updateData.priceUSD === undefined || updateData.priceUSD === '') {
            updateData.priceUSD = Number((p / 83.5).toFixed(2));
          }
        } else {
          // USD scale
          updateData.priceUSD = p;
          if (updateData.priceINR === undefined || updateData.priceINR === '') {
            updateData.priceINR = Math.round(p * 83.5);
          }
        }
      }
    }

    if (updateData.priceUSD !== undefined && updateData.priceUSD !== '') updateData.priceUSD = Number(updateData.priceUSD);
    if (updateData.priceINR !== undefined && updateData.priceINR !== '') updateData.priceINR = Number(updateData.priceINR);

    if (updateData.originalPrice !== undefined && (updateData.originalPriceUSD === undefined || updateData.originalPriceUSD === '')) {
      updateData.originalPriceUSD = Number(updateData.originalPrice);
    }
    if (updateData.originalPriceUSD !== undefined) {
      updateData.originalPriceUSD = updateData.originalPriceUSD ? Number(updateData.originalPriceUSD) : null;
    }
    if (updateData.stock !== undefined) updateData.stock = Number(updateData.stock);
    if (updateData.rating !== undefined) updateData.rating = Number(updateData.rating);
    if (updateData.reviews !== undefined) updateData.reviews = Number(updateData.reviews);

    // 2. Format and sanitize countryPricing
    let currentCountryPricing = { ...(existing.countryPricing || {}) };
    if (updateData.countryPricing !== undefined) {
      let parsed = updateData.countryPricing;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
      }
      if (typeof parsed === 'object' && parsed !== null) {
        Object.keys(parsed).forEach(k => {
          const num = Number(parsed[k]);
          if (!isNaN(num) && num >= 0) {
            currentCountryPricing[k.toUpperCase().trim()] = num;
          }
        });
      }
    }

    // Always keep countryPricing in sync with direct price updates
    if (updateData.priceINR !== undefined && !isNaN(Number(updateData.priceINR))) {
      currentCountryPricing['INR'] = Number(updateData.priceINR);
      currentCountryPricing['IN'] = Number(updateData.priceINR);
    }
    if (updateData.priceUSD !== undefined && !isNaN(Number(updateData.priceUSD))) {
      currentCountryPricing['USD'] = Number(updateData.priceUSD);
      currentCountryPricing['US'] = Number(updateData.priceUSD);
    }

    // If countryPricing was sent alone (e.g. from Country Pricing page), propagate back to base prices
    if (updateData.countryPricing !== undefined) {
      if (updateData.priceUSD === undefined) {
        if (currentCountryPricing['USD'] !== undefined && !isNaN(Number(currentCountryPricing['USD']))) {
          updateData.priceUSD = Number(currentCountryPricing['USD']);
        } else if (currentCountryPricing['US'] !== undefined && !isNaN(Number(currentCountryPricing['US']))) {
          updateData.priceUSD = Number(currentCountryPricing['US']);
        }
      }
      if (updateData.priceINR === undefined) {
        if (currentCountryPricing['INR'] !== undefined && !isNaN(Number(currentCountryPricing['INR']))) {
          updateData.priceINR = Number(currentCountryPricing['INR']);
        } else if (currentCountryPricing['IN'] !== undefined && !isNaN(Number(currentCountryPricing['IN']))) {
          updateData.priceINR = Number(currentCountryPricing['IN']);
        }
      }
    }

    // If one base price is set and the other is still missing, calculate the other
    if (updateData.priceUSD !== undefined && updateData.priceINR === undefined) {
      updateData.priceINR = currentCountryPricing['INR'] !== undefined ? Number(currentCountryPricing['INR']) : Math.round(updateData.priceUSD * 83.5);
      currentCountryPricing['INR'] = updateData.priceINR;
      currentCountryPricing['IN'] = updateData.priceINR;
    } else if (updateData.priceINR !== undefined && updateData.priceUSD === undefined) {
      updateData.priceUSD = currentCountryPricing['USD'] !== undefined ? Number(currentCountryPricing['USD']) : Number((updateData.priceINR / 83.5).toFixed(2));
      currentCountryPricing['USD'] = updateData.priceUSD;
      currentCountryPricing['US'] = updateData.priceUSD;
    }

    // Final synchronization to guarantee ISO & currency pairs match
    if (updateData.priceUSD !== undefined && !isNaN(Number(updateData.priceUSD))) {
      currentCountryPricing['USD'] = Number(updateData.priceUSD);
      currentCountryPricing['US'] = Number(updateData.priceUSD);
    }
    if (updateData.priceINR !== undefined && !isNaN(Number(updateData.priceINR))) {
      currentCountryPricing['INR'] = Number(updateData.priceINR);
      currentCountryPricing['IN'] = Number(updateData.priceINR);
    }

    if (updateData.priceUSD !== undefined) {
      updateData.price = updateData.priceUSD;
    }
    updateData.countryPricing = currentCountryPricing;

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
      data: enrichBookWithPricing(updated, req)
    });
  } catch (err) {
    next(err);
  }
};

const deleteBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    let existing = db.findById('books', id);

    if (!existing && mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const coll = mongoose.connection.db.collection('books');
        const numId = Number(id);
        const strId = String(id);
        const conditions = [];
        if (!isNaN(numId)) conditions.push({ id: numId });
        conditions.push({ id: strId });
        if (mongoose.Types.ObjectId.isValid(strId) && strId.length === 24) {
          conditions.push({ _id: new mongoose.Types.ObjectId(strId) });
        }
        existing = await coll.findOne(conditions.length === 1 ? conditions[0] : { $or: conditions });
      } catch {}
    }

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
