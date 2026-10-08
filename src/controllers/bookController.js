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

    // Check for uploaded files
    let coverUrl = image || 'images/default-book.jpg';
    let pdfUrl = pdfFile || '';

    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        try {
          const supCover = await supabaseService.uploadCoverImage(
            req.files.image[0].path,
            req.files.image[0].originalname,
            req.files.image[0].mimetype
          );
          if (supCover && supCover.success && supCover.url) {
            coverUrl = supCover.url;
          } else {
            coverUrl = `/uploads/covers/${req.files.image[0].filename}`;
          }
        } catch {
          coverUrl = `/uploads/covers/${req.files.image[0].filename}`;
        }
      }
      if (req.files.pdfFile && req.files.pdfFile[0]) {
        try {
          const supPdf = await supabaseService.uploadPdf(
            req.files.pdfFile[0].path,
            req.files.pdfFile[0].originalname,
            req.files.pdfFile[0].mimetype
          );
          if (supPdf && supPdf.success && supPdf.url) {
            pdfUrl = supPdf.url;
          } else {
            pdfUrl = `/uploads/pdfs/${req.files.pdfFile[0].filename}`;
          }
        } catch {
          pdfUrl = `/uploads/pdfs/${req.files.pdfFile[0].filename}`;
        }
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
      if (req.files.image && req.files.image[0]) {
        try {
          const supCover = await supabaseService.uploadCoverImage(
            req.files.image[0].path,
            req.files.image[0].originalname,
            req.files.image[0].mimetype
          );
          if (supCover && supCover.success && supCover.url) {
            updateData.image = supCover.url;
          } else {
            updateData.image = `/uploads/covers/${req.files.image[0].filename}`;
          }
        } catch {
          updateData.image = `/uploads/covers/${req.files.image[0].filename}`;
        }
      }
      if (req.files.pdfFile && req.files.pdfFile[0]) {
        try {
          const supPdf = await supabaseService.uploadPdf(
            req.files.pdfFile[0].path,
            req.files.pdfFile[0].originalname,
            req.files.pdfFile[0].mimetype
          );
          if (supPdf && supPdf.success && supPdf.url) {
            updateData.pdfFile = supPdf.url;
          } else {
            updateData.pdfFile = `/uploads/pdfs/${req.files.pdfFile[0].filename}`;
          }
        } catch {
          updateData.pdfFile = `/uploads/pdfs/${req.files.pdfFile[0].filename}`;
        }
      }
    } else if (req.file) {
      updateData.image = `/uploads/covers/${req.file.filename}`;
    }

    // Parse samplePages if passed as JSON string
    if (typeof updateData.samplePages === 'string') {
      try {
        updateData.samplePages = JSON.parse(updateData.samplePages);
      } catch {
        // keep as is
      }
    }

    const updated = db.update('books', id, updateData);

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

module.exports = {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook
};
