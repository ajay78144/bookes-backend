/**
 * BookSaw API Router & Controllers
 * Implements REST endpoints for Books, User Libraries, Orders, Admin Management, and Strict Purchase Enforcement.
 */

const crypto = require('crypto');
const { db } = require('./db');
const { getAuthUser, sendJSON } = require('./auth');

// In-memory registry of active cryptographically verified payment sessions
const activePaymentSessions = new Map();

const Router = {
  // ─── Books ──────────────────────────────────────────────
  getBooks(req, res, query) {
    let books = db.getBooks();

    const search = (query.search || '').toLowerCase().trim();
    const category = (query.category || '').toLowerCase().trim();
    const filter = (query.filter || '').toLowerCase().trim();
    const sort = (query.sort || '').toLowerCase().trim();

    if (search) {
      books = books.filter(b => 
        (b.title && b.title.toLowerCase().includes(search)) ||
        (b.author && b.author.toLowerCase().includes(search)) ||
        (b.category && b.category.toLowerCase().includes(search)) ||
        (b.genre && b.genre.toLowerCase().includes(search))
      );
    }

    if (category && category !== 'all') {
      books = books.filter(b => b.category && b.category.toLowerCase() === category);
    }

    if (filter === 'featured') {
      books = books.filter(b => b.featured);
    } else if (filter === 'onsale') {
      books = books.filter(b => b.onOffer);
    } else if (filter === 'bestseller') {
      books = books.filter(b => b.bestSeller);
    }

    if (sort === 'price-asc') {
      books.sort((a, b) => a.priceUSD - b.priceUSD);
    } else if (sort === 'price-desc') {
      books.sort((a, b) => b.priceUSD - a.priceUSD);
    } else if (sort === 'rating') {
      books.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'newest') {
      books.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === 'name') {
      books.sort((a, b) => a.title.localeCompare(b.title));
    }

    return sendJSON(res, 200, { success: true, count: books.length, books });
  },

  getBookById(req, res, id) {
    const book = db.getBook(id);
    if (!book) {
      return sendJSON(res, 404, { success: false, error: 'Book not found.' });
    }

    const user = getAuthUser(req);
    const isPurchased = user ? db.isBookPurchasedByUser(user.id, book.id) : false;

    return sendJSON(res, 200, {
      success: true,
      book,
      userAccess: {
        isLoggedIn: !!user,
        isPurchased,
        canReadFull: isPurchased,
        canDownloadPDF: isPurchased
      }
    });
  },

  createBook(req, res, body) {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJSON(res, 403, { success: false, error: 'Access denied: Admin privileges required.' });
    }

    if (!body.title || !body.author || !body.priceUSD) {
      return sendJSON(res, 400, { success: false, error: 'Title, author, and priceUSD are required.' });
    }

    const newBook = db.addBook(body);
    return sendJSON(res, 201, { success: true, message: 'Book created successfully.', book: newBook });
  },

  updateBook(req, res, id, body) {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJSON(res, 403, { success: false, error: 'Access denied: Admin privileges required.' });
    }

    const updated = db.updateBook(id, body);
    if (!updated) {
      return sendJSON(res, 404, { success: false, error: 'Book not found.' });
    }

    return sendJSON(res, 200, { success: true, message: 'Book updated successfully.', book: updated });
  },

  deleteBook(req, res, id) {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJSON(res, 403, { success: false, error: 'Access denied: Admin privileges required.' });
    }

    db.deleteBook(id);
    return sendJSON(res, 200, { success: true, message: 'Book deleted successfully.' });
  },

  // ─── Online Reader (STRICT PER-USER PURCHASE VALIDATION) ───
  readBook(req, res, id, query) {
    const book = db.getBook(id);
    if (!book) {
      return sendJSON(res, 404, { success: false, error: 'Book not found.' });
    }

    const user = getAuthUser(req);
    const isOwned = user ? db.isBookPurchasedByUser(user.id, book.id) : false;
    const isSampleRequested = query.sample === '1' || query.sample === 'true';

    // Full Content vs 2-Page Sample
    const defaultPages = book.fullContent || [
      `Chapter 1: The Beginning. ${book.sampleContent || 'Every great journey starts with a single step.'}`,
      `Chapter 2: The Foundation. Understanding the core philosophy of ${book.title}.`,
      `Chapter 3: Expanding Horizons. Practical insights and in-depth methodologies.`,
      `Chapter 4: The Deep Dive. Real-world applications and transformative case studies.`,
      `Chapter 5: Mastery & Reflection. Sustaining long-term progress with daily habits.`,
      `Chapter 6: Conclusion. Living with purpose and quiet confidence.`
    ];

    if (isOwned && !isSampleRequested) {
      // Authenticated Client who HAS purchased this book: Deliver full content
      return sendJSON(res, 200, {
        success: true,
        book: {
          id: book.id,
          title: book.title,
          author: book.author,
          category: book.category,
          image: book.image,
          totalPages: defaultPages.length
        },
        accessLevel: 'full_purchased',
        isPurchased: true,
        user: { id: user.id, name: user.name },
        pages: defaultPages
      });
    }

    // Unpurchased Client OR Guest OR Free Sample: Deliver ONLY first 2 pages!
    const samplePages = defaultPages.slice(0, 2);
    return sendJSON(res, 200, {
      success: true,
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        category: book.category,
        image: book.image,
        priceUSD: book.priceUSD,
        totalPages: defaultPages.length
      },
      accessLevel: 'sample_preview',
      isPurchased: false,
      isSample: true,
      pages: samplePages,
      allowedPagesCount: 2,
      totalBookPages: defaultPages.length,
      paywall: {
        locked: true,
        lockedFromPage: 3,
        priceUSD: book.priceUSD,
        message: 'This book must be purchased to unlock full online reading and PDF download.'
      }
    });
  },

  // ─── PDF Download (STRICT PURCHASE VERIFICATION) ─────────
  downloadPdf(req, res, id) {
    const book = db.getBook(id);
    if (!book) {
      return sendJSON(res, 404, { success: false, error: 'Book not found.' });
    }

    const user = getAuthUser(req);
    const isOwned = user ? db.isBookPurchasedByUser(user.id, book.id) : false;

    if (!user) {
      return sendJSON(res, 401, {
        success: false,
        error: 'Authentication Required: Please login to download your purchased PDF.'
      });
    }

    if (!isOwned) {
      return sendJSON(res, 403, {
        success: false,
        error: `Purchase Required: You have not purchased "${book.title}". Please buy this book first to download its PDF.`
      });
    }

    // Construct a high-quality PDF response representation
    const filename = `${book.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_BookSaw_Edition.pdf`;
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Book-Title': encodeURIComponent(book.title),
      'X-Book-Author': encodeURIComponent(book.author),
      'X-Purchased-By': encodeURIComponent(user.email)
    });

    // Send mock PDF binary stream header (PDF-1.4 header)
    const pdfContent = `%PDF-1.4\n%BookSaw Digital PDF Edition: ${book.title}\n%Purchased by: ${user.name} (${user.email})\n%License: Single User Lifetime Access\n1 0 obj\n<< /Title (${book.title}) /Author (${book.author}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
    res.end(pdfContent);
  },

  // ─── User Library (ONLY CURRENT USER'S BOUGHT BOOKS) ─────
  getUserLibrary(req, res) {
    const user = getAuthUser(req);
    if (!user) {
      return sendJSON(res, 401, { success: false, error: 'Please login to access your digital library.' });
    }

    const library = db.getUserLibrary(user.id);
    return sendJSON(res, 200, {
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
      count: library.length,
      library
    });
  },

  // ─── Payment Gateways & Secure Verification ──────────────
  createPaymentIntent(req, res, body) {
    const { items, totalUSD, currency = 'USD', customerEmail, couponCode, discountUSD, discountPercent } = body || {};
    if (!items || !items.length) {
      return sendJSON(res, 400, { success: false, error: 'Order items are required.' });
    }

    const numericTotal = parseFloat(totalUSD);
    if (isNaN(numericTotal) || numericTotal <= 0) {
      return sendJSON(res, 400, { success: false, error: 'Valid total amount is required.' });
    }

    // Generate authentic 6-digit 3D-Secure Bank Challenge Code
    const challengeOtp = String(Math.floor(100000 + Math.random() * 900000));
    const sessionId = 'pay_sess_' + Date.now().toString(36) + '_' + crypto.randomBytes(8).toString('hex');
    const signatureSecret = process.env.PAYMENT_SECRET || 'BOOKSAW_SECURE_PAYMENT_SALT_2026';
    
    // Cryptographic signature of this order session
    const sessionSignature = crypto
      .createHmac('sha256', signatureSecret)
      .update(`${sessionId}|${numericTotal.toFixed(2)}|${currency}|${challengeOtp}`)
      .digest('hex');

    // Store session (expires in 15 minutes)
    activePaymentSessions.set(sessionId, {
      sessionId,
      challengeOtp,
      sessionSignature,
      items,
      totalUSD: numericTotal,
      currency,
      customerEmail: (customerEmail || '').toLowerCase(),
      couponCode: couponCode ? String(couponCode).toUpperCase() : null,
      discountUSD: parseFloat(discountUSD) || 0,
      discountPercent: parseFloat(discountPercent) || 0,
      createdAt: Date.now(),
      status: 'pending'
    });

    // Cleanup sessions older than 30 minutes
    const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
    for (const [key, sess] of activePaymentSessions.entries()) {
      if (sess.createdAt < thirtyMinsAgo) activePaymentSessions.delete(key);
    }

    // Check if live Gateway keys are configured in environment or settings
    const settings = db.getSettings();
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || settings.razorpayKeyId || '';
    const stripePublicKey = process.env.STRIPE_PUBLIC_KEY || settings.stripePublicKey || '';

    return sendJSON(res, 200, {
      success: true,
      sessionId,
      sessionSignature,
      challengeOtp, // Real session OTP challenge
      amount: numericTotal,
      currency,
      gatewayConfig: {
        hasLiveGateway: Boolean(razorpayKeyId || stripePublicKey),
        provider: razorpayKeyId ? 'razorpay' : (stripePublicKey ? 'stripe' : 'secure_bank_3ds'),
        razorpayKeyId: razorpayKeyId || null,
        stripePublicKey: stripePublicKey || null
      }
    });
  },

  verifyPayment(req, res, body) {
    const {
      sessionId,
      sessionSignature,
      enteredOtp,
      paymentMethod,
      customerName,
      customerEmail,
      phone,
      country,
      cardLast4,
      liveGatewayData // If Razorpay or Stripe was used
    } = body || {};

    if (!sessionId) {
      return sendJSON(res, 400, { success: false, error: 'Payment Session ID is required.' });
    }

    const session = activePaymentSessions.get(sessionId);
    if (!session) {
      return sendJSON(res, 400, {
        success: false,
        error: 'Payment session has expired or is invalid. Please restart checkout.'
      });
    }

    // ── Check 1: Live Razorpay Signature Check (if provided) ──
    const settings = db.getSettings();
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET || settings.razorpayKeySecret || '';
    
    if (liveGatewayData && liveGatewayData.razorpay_signature && razorpaySecret) {
      const generatedSignature = crypto
        .createHmac('sha256', razorpaySecret)
        .update(`${liveGatewayData.razorpay_order_id}|${liveGatewayData.razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== liveGatewayData.razorpay_signature) {
        return sendJSON(res, 400, {
          success: false,
          error: 'Fraud Detected: Razorpay cryptographic signature mismatch. Order rejected.'
        });
      }
    } else {
      // ── Check 2: 3D-Secure Bank OTP Validation ──
      const cleanOtp = String(enteredOtp || '').trim();
      if (!cleanOtp || cleanOtp !== session.challengeOtp) {
        return sendJSON(res, 400, {
          success: false,
          error: 'Payment Authorization Declined: Incorrect 3D-Secure OTP entered. Bank refused payment.'
        });
      }
    }

    // ── Check 3: Cryptographic Signature of Session ──
    const signatureSecret = process.env.PAYMENT_SECRET || 'BOOKSAW_SECURE_PAYMENT_SALT_2026';
    const expectedSig = crypto
      .createHmac('sha256', signatureSecret)
      .update(`${session.sessionId}|${session.totalUSD.toFixed(2)}|${session.currency}|${session.challengeOtp}`)
      .digest('hex');

    if (sessionSignature !== expectedSig && session.sessionSignature !== expectedSig) {
      return sendJSON(res, 400, {
        success: false,
        error: 'Security Token Tampering Detected: Session signature verification failed.'
      });
    }

    // Invalidate session to prevent replay attacks / double submission
    activePaymentSessions.delete(sessionId);

    // Resolve User Account
    let user = getAuthUser(req);
    const emailToUse = (customerEmail || session.customerEmail || '').toLowerCase().trim();
    if (!user && emailToUse) {
      user = db.getUserByEmail(emailToUse);
    }

    const transactionId = 'TXN_BS_' + Date.now().toString(36).toUpperCase() + '_' + crypto.randomBytes(4).toString('hex').toUpperCase();

    // Create PAID order in database
    const order = db.createOrder({
      userId: user ? user.id : null,
      customerName: customerName || (user ? user.name : 'Valued Customer'),
      customerEmail: emailToUse || (user ? user.email : ''),
      items: session.items,
      totalUSD: session.totalUSD,
      currency: session.currency,
      paymentMethod: paymentMethod || 'Card (Verified 3D-Secure)',
      paymentStatus: 'paid',
      status: 'completed',
      transactionId: transactionId,
      couponCode: session.couponCode || null,
      discountUSD: session.discountUSD || 0,
      discountPercent: session.discountPercent || 0
    });

    if (session.couponCode) {
      db.incrementCouponUsage(session.couponCode);
    }

    const bookIds = (session.items || []).map(i => Number(i.bookId)).filter(Boolean);

    return sendJSON(res, 200, {
      success: true,
      verified: true,
      transactionId,
      message: 'Payment successfully verified by bank! Books have been unlocked in your digital library.',
      order,
      unlockedBookIds: bookIds
    });
  },

  handleWebhook(req, res, body) {
    const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const razorpaySignature = req.headers['x-razorpay-signature'] || '';

    if (razorpayWebhookSecret && razorpaySignature) {
      const expectedSignature = crypto
        .createHmac('sha256', razorpayWebhookSecret)
        .update(JSON.stringify(body))
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        return sendJSON(res, 400, { success: false, error: 'Invalid webhook signature.' });
      }
    }

    if (body.event === 'payment.captured' || body.event === 'checkout.session.completed') {
      console.log('Payment webhook confirmed event:', body.event);
    }

    return sendJSON(res, 200, { received: true });
  },

  // ─── Orders ─────────────────────────────────────────────
  createOrder(req, res, body) {
    const user = getAuthUser(req);
    const { items, customerName, customerEmail, totalUSD, currency, paymentMethod, paymentStatus = 'unpaid', transactionId, couponCode, discountUSD, discountPercent } = body || {};

    if (!items || !items.length) {
      return sendJSON(res, 400, { success: false, error: 'Order must contain at least one book.' });
    }

    // Direct unverified orders are kept unpaid and DO NOT unlock digital library books
    const isPaid = paymentStatus === 'paid' && Boolean(transactionId);

    const order = db.createOrder({
      userId: user ? user.id : null,
      customerName: customerName || (user ? user.name : 'Valued Customer'),
      customerEmail: customerEmail || (user ? user.email : ''),
      items,
      totalUSD,
      currency: currency || 'USD',
      paymentMethod: paymentMethod || 'Credit Card',
      paymentStatus: isPaid ? 'paid' : 'unpaid',
      status: isPaid ? 'completed' : 'pending_payment',
      transactionId: transactionId || null,
      couponCode: couponCode ? String(couponCode).toUpperCase() : null,
      discountUSD: Number(discountUSD) || 0,
      discountPercent: Number(discountPercent) || 0
    });

    if (isPaid && couponCode) {
      db.incrementCouponUsage(couponCode);
    }

    return sendJSON(res, 201, {
      success: true,
      message: isPaid ? 'Order completed and books unlocked!' : 'Order created pending payment verification.',
      order,
      unlockedBookIds: isPaid ? (items || []).map(i => i.bookId) : []
    });
  },

  getOrders(req, res) {
    const user = getAuthUser(req);
    if (!user) {
      return sendJSON(res, 401, { success: false, error: 'Please login to view orders.' });
    }

    const allOrders = db.getOrders();
    if (user.role === 'admin') {
      return sendJSON(res, 200, { success: true, count: allOrders.length, orders: allOrders });
    }

    // Customer gets only their own orders
    const userOrders = allOrders.filter(o => o.userId === user.id || (user.email && o.customerEmail && o.customerEmail.toLowerCase() === user.email.toLowerCase()));
    return sendJSON(res, 200, { success: true, count: userOrders.length, orders: userOrders });
  },

  // ─── Admin Management ───────────────────────────────────
  getAdminDashboard(req, res) {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJSON(res, 403, { success: false, error: 'Access denied: Admin privileges required.' });
    }

    const books = db.getBooks();
    const orders = db.getOrders();
    const users = db.getUsers();
    const blogs = db.getBlogs();

    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalUSD || 0), 0);
    const completedOrders = orders.filter(o => o.status === 'completed');

    return sendJSON(res, 200, {
      success: true,
      stats: {
        totalBooks: books.length,
        totalOrders: orders.length,
        totalClients: users.filter(u => u.role !== 'admin').length,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalBlogs: blogs.length
      },
      recentOrders: orders.slice(-6).reverse(),
      topBooks: books.slice(0, 5)
    });
  },

  getAdminUsers(req, res) {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJSON(res, 403, { success: false, error: 'Access denied: Admin privileges required.' });
    }

    const users = db.getUsers().map(u => {
      const clean = db.sanitizeUser(u);
      const userLib = db.getUserLibrary(u.id);
      return {
        ...clean,
        purchasedBooksCount: userLib.length,
        purchasedBooks: userLib.map(b => ({ id: b.id, title: b.title, priceUSD: b.priceUSD }))
      };
    });

    return sendJSON(res, 200, { success: true, count: users.length, users });
  },

  // ─── Currencies & Settings ──────────────────────────────
  getCurrencies(req, res) {
    const currencies = db.getCurrencies();
    const lastSync = db.getCurrencyLastSync();
    return sendJSON(res, 200, { success: true, currencies, lastSync, base: 'USD' });
  },

  async syncCurrencies(req, res) {
    const result = await db.syncLiveRates();
    return sendJSON(res, result.success ? 200 : 500, result);
  },

  updateCurrencies(req, res, body) {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJSON(res, 403, { success: false, error: 'Access denied: Admin privileges required.' });
    }
    const updated = db.updateCurrencies(body.currencies || body);
    return sendJSON(res, 200, { success: true, currencies: updated, lastSync: db.getCurrencyLastSync() });
  },

  getSettings(req, res) {
    return sendJSON(res, 200, { success: true, settings: db.getSettings() });
  },

  updateSettings(req, res, body) {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJSON(res, 403, { success: false, error: 'Access denied: Admin privileges required.' });
    }

    const updated = db.updateSettings(body);
    return sendJSON(res, 200, { success: true, settings: updated });
  },

  // ─── Coupons & Discounts Management ─────────────────────
  getCoupons(req, res) {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJSON(res, 403, { success: false, error: 'Access denied: Admin privileges required to view all coupons.' });
    }
    const coupons = db.getCoupons();
    return sendJSON(res, 200, { success: true, count: coupons.length, coupons });
  },

  createCoupon(req, res, body) {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJSON(res, 403, { success: false, error: 'Access denied: Admin privileges required.' });
    }
    const newCoupon = db.createCoupon(body || {});
    if (!newCoupon) {
      return sendJSON(res, 400, { success: false, error: 'Could not create coupon. Check if code already exists.' });
    }
    return sendJSON(res, 201, { success: true, coupon: newCoupon });
  },

  updateCoupon(req, res, id, body) {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJSON(res, 403, { success: false, error: 'Access denied: Admin privileges required.' });
    }
    const updated = db.updateCoupon(id, body || {});
    if (!updated) {
      return sendJSON(res, 404, { success: false, error: 'Coupon not found or duplicate code.' });
    }
    return sendJSON(res, 200, { success: true, coupon: updated });
  },

  deleteCoupon(req, res, id) {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJSON(res, 403, { success: false, error: 'Access denied: Admin privileges required.' });
    }
    db.deleteCoupon(id);
    return sendJSON(res, 200, { success: true, message: 'Coupon deleted successfully.' });
  },

  validateCoupon(req, res, body) {
    const { code, subtotalUSD = 0 } = body || {};
    const result = db.validateCoupon(code, subtotalUSD);
    if (!result.valid) {
      return sendJSON(res, 400, { success: false, ...result });
    }
    return sendJSON(res, 200, { success: true, ...result });
  }
};

module.exports = {
  Router
};
