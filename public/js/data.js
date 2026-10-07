/**
 * BookSaw E-Commerce Data Backend
 * Uses localStorage as a persistent data store
 */

const DB = {
  // ─── Keys ──────────────────────────────────────────────
  KEYS: {
    BOOKS: 'bs_books',
    USERS: 'bs_users',
    ORDERS: 'bs_orders',
    BLOGS: 'bs_blogs',
    CART: 'bs_cart',
    CURRENCY: 'bs_currency',
    CURRENT_USER: 'bs_current_user',
    SETTINGS: 'bs_settings',
    WISHLIST: 'bs_wishlist',
    COUPONS: 'bs_coupons',
    COUNTRY_PRICING_RULES: 'bs_country_pricing_rules'
  },

  // ─── Generic Helpers ────────────────────────────────────
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },
  getObj(key, def = {}) {
    try { return JSON.parse(localStorage.getItem(key)) || def; }
    catch { return def; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id || 0)) + 1 : 1; },

  // ─── Books ──────────────────────────────────────────────
  getBooks() { return this.get(this.KEYS.BOOKS); },
  saveBooks(books) { this.set(this.KEYS.BOOKS, books); },
  addBook(book) {
    const books = this.getBooks();
    book.id = this.nextId(books);
    book.createdAt = new Date().toISOString();
    books.push(book);
    this.saveBooks(books);
    return book;
  },
  updateBook(id, data) {
    const books = this.getBooks();
    const i = books.findIndex(b => b.id === id);
    if (i > -1) { books[i] = { ...books[i], ...data, updatedAt: new Date().toISOString() }; this.saveBooks(books); return books[i]; }
    return null;
  },
  deleteBook(id) {
    const books = this.getBooks().filter(b => b.id !== id);
    this.saveBooks(books);
  },
  getBook(id) { return this.getBooks().find(b => b.id === id) || null; },

  // ─── Users ──────────────────────────────────────────────
  getUsers() { return this.get(this.KEYS.USERS); },
  saveUsers(users) { this.set(this.KEYS.USERS, users); },
  addUser(user) {
    const users = this.getUsers();
    const cleanEmail = (user.email || '').trim().toLowerCase();
    if (users.find(u => (u.email || '').toLowerCase() === cleanEmail)) return null;
    user.email = cleanEmail;
    user.id = this.nextId(users);
    user.createdAt = new Date().toISOString();
    user.role = user.role || 'customer';
    user.country = user.country || 'US';
    user.currency = user.currency || 'USD';
    users.push(user);
    this.saveUsers(users);
    return user;
  },
  findUser(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    return this.getUsers().find(u => (u.email || '').toLowerCase() === cleanEmail && u.password === password) || null;
  },
  getCurrentUser() { return this.getObj(this.KEYS.CURRENT_USER, null); },
  setCurrentUser(user) {
    this.set(this.KEYS.CURRENT_USER, user);
    // Automatic Currency Sync: Activate user's preferred country currency across the entire website
    if (user && user.currency) {
      const s = this.getCurrencySettings();
      this.saveCurrencySettings({ ...s, selected: user.currency });
      if (typeof updateAllPrices === 'function') updateAllPrices();
      if (typeof document !== 'undefined') {
        const sel = document.getElementById('currency-selector');
        if (sel) sel.value = user.currency;
      }
    }
  },
  logout() { localStorage.removeItem(this.KEYS.CURRENT_USER); },
  isAdmin() { const u = this.getCurrentUser(); return u && u.role === 'admin'; },
  isLoggedIn() { return !!this.getCurrentUser(); },

  // ─── Orders ─────────────────────────────────────────────
  getOrders() { return this.get(this.KEYS.ORDERS); },
  saveOrders(orders) { this.set(this.KEYS.ORDERS, orders); },
  addOrder(order) {
    const orders = this.getOrders();
    order.id = this.nextId(orders);
    order.createdAt = new Date().toISOString();
    order.status = order.status || 'pending';
    orders.push(order);
    this.saveOrders(orders);
    return order;
  },
  updateOrderStatus(id, status) {
    const orders = this.getOrders();
    const i = orders.findIndex(o => o.id === id);
    if (i > -1) { orders[i].status = status; orders[i].updatedAt = new Date().toISOString(); this.saveOrders(orders); }
  },
  getUserOrders(userId) {
    let uId = userId;
    let uEmail = '';
    const curr = this.getCurrentUser();
    if (!uId && curr) uId = curr.id;
    if (curr && curr.email) uEmail = curr.email.toLowerCase().trim();
    return this.getOrders().filter(o => {
      if (uId && (o.userId === uId || String(o.userId) === String(uId))) return true;
      if (uEmail && o.email && o.email.toLowerCase().trim() === uEmail) return true;
      if (uEmail && o.customerEmail && o.customerEmail.toLowerCase().trim() === uEmail) return true;
      return false;
    });
  },
  getUserTotalSpent(userId) {
    const orders = this.getUserOrders(userId).filter(o => o.status === 'completed' || o.paymentStatus === 'paid');
    const totalUSD = orders.reduce((sum, o) => sum + (Number(o.totalUSD) || 0), 0);
    return {
      totalUSD,
      formatted: typeof Currency !== 'undefined' ? Currency.formatSelected(totalUSD) : '$' + totalUSD.toFixed(2),
      ordersCount: orders.length
    };
  },
  getUserActivity(userId) {
    const user = this.getCurrentUser();
    const activities = [];
    if (!user) return activities;

    if (user.createdAt) {
      activities.push({
        type: 'account_created',
        icon: '🎉',
        title: 'Account Registered',
        description: `Verified reader account created (${user.email})`,
        time: user.createdAt
      });
    }

    const orders = this.getUserOrders(user.id);
    orders.forEach(o => {
      activities.push({
        type: 'order_completed',
        icon: '💳',
        title: `Purchased ${(o.items || []).length} Digital Book(s)`,
        description: `Order #BS-${String(o.id).padStart(5, '0')} • Spent ${o.totalFormatted || (typeof Currency !== 'undefined' ? Currency.formatSelected(o.totalUSD || 0) : '$' + (o.totalUSD || 0))}`,
        time: o.createdAt || new Date().toISOString(),
        orderId: o.id
      });
    });

    const libIds = this.getUserLibrary(user.id);
    libIds.forEach(bId => {
      const b = this.getBook(bId);
      if (b) {
        activities.push({
          type: 'book_unlocked',
          icon: '📖',
          title: `Unlocked "${b.title}"`,
          description: `Permanent digital library access and offline PDF downloads ready`,
          time: user.updatedAt || user.createdAt || new Date().toISOString(),
          bookId: b.id
        });
      }
    });

    return activities.sort((a, b) => new Date(b.time) - new Date(a.time));
  },

  // ─── Blogs ──────────────────────────────────────────────
  getBlogs() { return this.get(this.KEYS.BLOGS); },
  saveBlogs(blogs) { this.set(this.KEYS.BLOGS, blogs); },
  addBlog(blog) {
    const blogs = this.getBlogs();
    blog.id = this.nextId(blogs);
    blog.createdAt = new Date().toISOString();
    blog.published = blog.published !== undefined ? blog.published : true;
    blogs.push(blog);
    this.saveBlogs(blogs);
    return blog;
  },
  updateBlog(id, data) {
    const blogs = this.getBlogs();
    const i = blogs.findIndex(b => b.id === id);
    if (i > -1) { blogs[i] = { ...blogs[i], ...data, updatedAt: new Date().toISOString() }; this.saveBlogs(blogs); return blogs[i]; }
    return null;
  },
  deleteBlog(id) { this.saveBlogs(this.getBlogs().filter(b => b.id !== id)); },
  getBlog(id) { return this.getBlogs().find(b => b.id === id) || null; },

  // ─── Cart ───────────────────────────────────────────────
  getCart() { return this.get(this.KEYS.CART); },
  saveCart(cart) { this.set(this.KEYS.CART, cart); },
  addToCart(book, qty = 1) {
    if (!this.isLoggedIn()) return false;
    const cart = this.getCart();
    const i = cart.findIndex(c => c.bookId === book.id);
    if (i > -1) cart[i].qty += qty;
    else cart.push({ bookId: book.id, title: book.title, author: book.author, priceUSD: book.priceUSD, image: book.image, qty });
    this.saveCart(cart);
    return true;
  },
  updateCartQty(bookId, qty) {
    let cart = this.getCart();
    if (qty <= 0) cart = cart.filter(c => c.bookId !== bookId);
    else { const i = cart.findIndex(c => c.bookId === bookId); if (i > -1) cart[i].qty = qty; }
    this.saveCart(cart);
  },
  removeFromCart(bookId) { this.saveCart(this.getCart().filter(c => c.bookId !== bookId)); },
  clearCart() { this.saveCart([]); },
  cartCount() { return this.getCart().reduce((s, c) => s + c.qty, 0); },

  // ─── Coupons & Promo Codes ──────────────────────────────
  getCoupons() {
    let coupons = this.get(this.KEYS.COUPONS);
    if (!coupons || coupons.length === 0) {
      coupons = [
        {
          id: 1,
          code: 'MYBOOK10',
          discountPercent: 10,
          description: 'Special 10% Off Any Book Purchase',
          isActive: true,
          usageCount: 0,
          minOrderUSD: 0,
          createdAt: new Date().toISOString()
        }
      ];
      this.saveCoupons(coupons);
    }
    return coupons;
  },
  saveCoupons(coupons) { this.set(this.KEYS.COUPONS, coupons); },
  addCoupon(data) {
    const coupons = this.getCoupons();
    const cleanCode = (data.code || '').trim().toUpperCase();
    if (!cleanCode) return null;
    if (coupons.find(c => c.code.toUpperCase() === cleanCode)) return null; // duplicate
    const newCoupon = {
      id: this.nextId(coupons),
      code: cleanCode,
      discountPercent: Math.max(1, Math.min(100, parseFloat(data.discountPercent) || 10)),
      description: data.description || `${data.discountPercent || 10}% Off Promo Code`,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      minOrderUSD: Math.max(0, parseFloat(data.minOrderUSD) || 0),
      usageCount: 0,
      createdAt: new Date().toISOString()
    };
    coupons.push(newCoupon);
    this.saveCoupons(coupons);
    return newCoupon;
  },
  updateCoupon(id, data) {
    const coupons = this.getCoupons();
    const i = coupons.findIndex(c => c.id === parseInt(id));
    if (i > -1) {
      if (data.code) {
        const clean = data.code.trim().toUpperCase();
        const existing = coupons.find(c => c.code.toUpperCase() === clean && c.id !== parseInt(id));
        if (existing) return null; // code collision
        coupons[i].code = clean;
      }
      if (data.discountPercent !== undefined) {
        coupons[i].discountPercent = Math.max(1, Math.min(100, parseFloat(data.discountPercent) || 10));
      }
      if (data.description !== undefined) coupons[i].description = data.description;
      if (data.isActive !== undefined) coupons[i].isActive = Boolean(data.isActive);
      if (data.minOrderUSD !== undefined) coupons[i].minOrderUSD = Math.max(0, parseFloat(data.minOrderUSD) || 0);
      coupons[i].updatedAt = new Date().toISOString();
      this.saveCoupons(coupons);
      return coupons[i];
    }
    return null;
  },
  deleteCoupon(id) {
    const coupons = this.getCoupons().filter(c => c.id !== parseInt(id));
    this.saveCoupons(coupons);
  },
  getCoupon(id) {
    return this.getCoupons().find(c => c.id === parseInt(id)) || null;
  },
  validateCoupon(code, subtotalUSD = 0) {
    if (!code) return { valid: false, message: 'Please enter a coupon code.' };
    const clean = code.trim().toUpperCase();
    const coupon = this.getCoupons().find(c => c.code.toUpperCase() === clean);
    if (!coupon) {
      return { valid: false, message: '❌ Invalid coupon code. Please check and try again.' };
    }
    if (!coupon.isActive) {
      return { valid: false, message: '⚠️ This coupon code is currently disabled.' };
    }
    if (coupon.minOrderUSD > 0 && subtotalUSD < coupon.minOrderUSD) {
      return { valid: false, message: `⚠️ Minimum order of $${coupon.minOrderUSD} required for coupon "${coupon.code}".` };
    }
    const discountAmountUSD = parseFloat((subtotalUSD * (coupon.discountPercent / 100)).toFixed(2));
    const newSubtotalUSD = Math.max(0, parseFloat((subtotalUSD - discountAmountUSD).toFixed(2)));
    return {
      valid: true,
      coupon,
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      discountUSD: discountAmountUSD,
      discountAmountUSD,
      newSubtotalUSD,
      message: `🎉 Coupon "${coupon.code}" applied! ${coupon.discountPercent}% OFF`
    };
  },
  incrementCouponUsage(code) {
    const clean = (code || '').trim().toUpperCase();
    const coupons = this.getCoupons();
    const c = coupons.find(x => x.code.toUpperCase() === clean);
    if (c) {
      c.usageCount = (c.usageCount || 0) + 1;
      this.saveCoupons(coupons);
    }
  },

  // ─── Wishlist ───────────────────────────────────────────
  getWishlist() { return this.get(this.KEYS.WISHLIST); },
  toggleWishlist(bookId) {
    let w = this.getWishlist();
    if (w.includes(bookId)) w = w.filter(id => id !== bookId);
    else w.push(bookId);
    this.set(this.KEYS.WISHLIST, w);
    return w.includes(bookId);
  },
  inWishlist(bookId) { return this.getWishlist().includes(bookId); },

  // ─── Currency ───────────────────────────────────────────
  getCurrencySettings() {
    return this.getObj(this.KEYS.CURRENCY, {
      selected: 'USD',
      autoDetected: null,
      rates: CURRENCY_RATES
    });
  },
  saveCurrencySettings(settings) { this.set(this.KEYS.CURRENCY, settings); },
  setSelectedCurrency(code) {
    const s = this.getCurrencySettings();
    s.selected = code;
    this.saveCurrencySettings(s);
  },

  // ─── Country-Wise Regional Book Pricing & Rules ────────────
  getCountryPricingRules() {
    return this.getObj(this.KEYS.COUNTRY_PRICING_RULES, {
      INR: { enabled: true, discountPercent: 60, name: 'India PPP' },
      PKR: { enabled: true, discountPercent: 60, name: 'Pakistan PPP' },
      BDT: { enabled: true, discountPercent: 60, name: 'Bangladesh PPP' },
      BRL: { enabled: false, discountPercent: 30, name: 'Brazil PPP' },
      NGN: { enabled: false, discountPercent: 60, name: 'Nigeria PPP' }
    });
  },
  saveCountryPricingRules(rules) {
    this.set(this.KEYS.COUNTRY_PRICING_RULES, rules);
    if (typeof updateAllPrices === 'function') updateAllPrices();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bs_pricing_updated', { detail: { rules } }));
    }
  },
  setBookCountryPrice(bookId, currencyCode, price) {
    const books = this.getBooks();
    const idx = books.findIndex(b => b.id === bookId);
    if (idx > -1) {
      if (!books[idx].countryPricing) books[idx].countryPricing = {};
      if (price === null || price === undefined || price === '' || isNaN(price) || price < 0) {
        delete books[idx].countryPricing[currencyCode];
      } else {
        books[idx].countryPricing[currencyCode] = parseFloat(parseFloat(price).toFixed(2));
      }
      books[idx].updatedAt = new Date().toISOString();
      this.saveBooks(books);
      if (typeof updateAllPrices === 'function') updateAllPrices();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bs_pricing_updated', { detail: { book: books[idx] } }));
      }
      return books[idx];
    }
    return null;
  },
  resetBookCountryPricing(bookId, currencyCode = null) {
    const books = this.getBooks();
    const idx = books.findIndex(b => b.id === bookId);
    if (idx > -1) {
      if (!books[idx].countryPricing) return books[idx];
      if (currencyCode) {
        delete books[idx].countryPricing[currencyCode];
      } else {
        books[idx].countryPricing = {};
      }
      books[idx].updatedAt = new Date().toISOString();
      this.saveBooks(books);
      if (typeof updateAllPrices === 'function') updateAllPrices();
      return books[idx];
    }
    return null;
  },
  bulkSetCountryDiscount(currencyCode, discountPercent) {
    const rules = this.getCountryPricingRules();
    rules[currencyCode] = {
      enabled: discountPercent > 0,
      discountPercent: parseFloat(discountPercent) || 0,
      updatedAt: new Date().toISOString()
    };
    this.saveCountryPricingRules(rules);
    return rules;
  },

  // ─── Digital Library (E-Book & PDF Access) ──────────────────
  getUserLibrary(userId) {
    let uId = userId;
    if (!uId) {
      const u = this.getCurrentUser();
      if (u) uId = u.id;
    }
    const library = new Set();

    // From registered user profile if present
    if (uId) {
      const user = this.getUsers().find(u => u.id === uId);
      if (user && Array.isArray(user.library)) {
        user.library.forEach(id => library.add(Number(id)));
      }
      // From completed user orders
      const userOrders = this.getOrders().filter(o => o.userId === uId && (o.status === 'completed' || o.paymentStatus === 'paid'));
      userOrders.forEach(o => {
        (o.items || []).forEach(item => {
          if (item && item.bookId) library.add(Number(item.bookId));
        });
      });
    }

    // Purchased books are strictly bound to authenticated user ID
    return Array.from(library);
  },

  isBookPurchased(bookId, userId) {
    if (!bookId) return false;
    let uId = userId;
    if (!uId) {
      const u = this.getCurrentUser();
      if (!u) return false;
      uId = u.id;
    }
    const lib = this.getUserLibrary(uId);
    return lib.includes(Number(bookId));
  },

  addToUserLibrary(userId, bookIds) {
    if (!Array.isArray(bookIds)) bookIds = [bookIds];
    bookIds = bookIds.map(Number);

    // Save in user profile strictly if logged in
    if (userId) {
      const users = this.getUsers();
      const u = users.find(x => x.id === userId);
      if (u) {
        u.library = u.library || [];
        bookIds.forEach(id => {
          if (!u.library.includes(id)) u.library.push(id);
        });
        this.saveUsers(users);
        const curr = this.getCurrentUser();
        if (curr && curr.id === userId) {
          curr.library = u.library;
          this.setCurrentUser(curr);
        }
      }
    }
    // Clean up any legacy guest library to prevent leakage across users
    try { localStorage.removeItem('bs_guest_library'); } catch(e){}
  },

  // ─── Settings ───────────────────────────────────────────
  getSettings() {
    return this.getObj(this.KEYS.SETTINGS, {
      siteName: 'BookSaw',
      siteTagline: 'Instant PDF E-Books & Online Digital Reader',
      currency: 'USD',
      taxRate: 0,
      shippingFee: 0,
      freeShippingAbove: 0,
      deliveryType: 'instant_digital'
    });
  },
  saveSettings(s) { this.set(this.KEYS.SETTINGS, s); }
};

// ─── Currency Rates (relative to USD) - Auto-synced with Live Global Markets ──
const CURRENCY_RATES = {
  USD: { symbol: '$', rate: 1, name: 'US Dollar', flag: '🇺🇸' },
  EUR: { symbol: '€', rate: 0.8818, name: 'Euro', flag: '🇪🇺' },
  GBP: { symbol: '£', rate: 0.7538, name: 'British Pound', flag: '🇬🇧' },
  INR: { symbol: '₹', rate: 96.00, name: 'Indian Rupee', flag: '🇮🇳' },
  PKR: { symbol: '₨', rate: 276.98, name: 'Pakistani Rupee', flag: '🇵🇰' },
  BDT: { symbol: '৳', rate: 123.02, name: 'Bangladeshi Taka', flag: '🇧🇩' },
  AED: { symbol: 'د.إ', rate: 3.6725, name: 'UAE Dirham', flag: '🇦🇪' },
  SAR: { symbol: '﷼', rate: 3.75, name: 'Saudi Riyal', flag: '🇸🇦' },
  QAR: { symbol: 'QR', rate: 3.64, name: 'Qatari Riyal', flag: '🇶🇦' },
  OMR: { symbol: 'OMR', rate: 0.3845, name: 'Omani Rial', flag: '🇴🇲' },
  KWD: { symbol: 'KD', rate: 0.3085, name: 'Kuwaiti Dinar', flag: '🇰🇼' },
  BHD: { symbol: 'BD', rate: 0.376, name: 'Bahraini Dinar', flag: '🇧🇭' },
  CAD: { symbol: 'C$', rate: 1.421, name: 'Canadian Dollar', flag: '🇨🇦' },
  AUD: { symbol: 'A$', rate: 1.438, name: 'Australian Dollar', flag: '🇦🇺' },
  NZD: { symbol: 'NZ$', rate: 1.678, name: 'New Zealand Dollar', flag: '🇳🇿' },
  SGD: { symbol: 'S$', rate: 1.278, name: 'Singapore Dollar', flag: '🇸🇬' },
  MYR: { symbol: 'RM', rate: 4.079, name: 'Malaysian Ringgit', flag: '🇲🇾' },
  IDR: { symbol: 'Rp', rate: 17904, name: 'Indonesian Rupiah', flag: '🇮🇩' },
  PHP: { symbol: '₱', rate: 62.75, name: 'Philippine Peso', flag: '🇵🇭' },
  THB: { symbol: '฿', rate: 33.58, name: 'Thai Baht', flag: '🇹🇭' },
  JPY: { symbol: '¥', rate: 157.3, name: 'Japanese Yen', flag: '🇯🇵' },
  CNY: { symbol: '¥', rate: 6.717, name: 'Chinese Yuan', flag: '🇨🇳' },
  KRW: { symbol: '₩', rate: 1356, name: 'South Korean Won', flag: '🇰🇷' },
  TRY: { symbol: '₺', rate: 49.05, name: 'Turkish Lira', flag: '🇹🇷' },
  RUB: { symbol: '₽', rate: 83.69, name: 'Russian Ruble', flag: '🇷🇺' },
  CHF: { symbol: 'CHF', rate: 0.812, name: 'Swiss Franc', flag: '🇨🇭' },
  SEK: { symbol: 'kr', rate: 9.68, name: 'Swedish Krona', flag: '🇸🇪' },
  NOK: { symbol: 'kr', rate: 10.15, name: 'Norwegian Krone', flag: '🇳🇴' },
  DKK: { symbol: 'kr', rate: 6.58, name: 'Danish Krone', flag: '🇩🇰' },
  PLN: { symbol: 'zł', rate: 3.78, name: 'Polish Zloty', flag: '🇵🇱' },
  ZAR: { symbol: 'R', rate: 17.58, name: 'South African Rand', flag: '🇿🇦' },
  NGN: { symbol: '₦', rate: 1580, name: 'Nigerian Naira', flag: '🇳🇬' },
  EGP: { symbol: 'E£', rate: 48.5, name: 'Egyptian Pound', flag: '🇪🇬' },
  KES: { symbol: 'KSh', rate: 129, name: 'Kenyan Shilling', flag: '🇰🇪' },
  BRL: { symbol: 'R$', rate: 5.20, name: 'Brazilian Real', flag: '🇧🇷' },
  MXN: { symbol: '$', rate: 18.08, name: 'Mexican Peso', flag: '🇲🇽' },
  ARS: { symbol: '$', rate: 1240, name: 'Argentine Peso', flag: '🇦🇷' }
};

// Country → Currency mapping
const COUNTRY_CURRENCY = {
  US: 'USD', GB: 'GBP', IN: 'INR', PK: 'PKR', BD: 'BDT',
  AE: 'AED', SA: 'SAR', QA: 'QAR', OM: 'OMR', KW: 'KWD', BH: 'BHD',
  CA: 'CAD', AU: 'AUD', NZ: 'NZD', SG: 'SGD', MY: 'MYR', ID: 'IDR',
  PH: 'PHP', TH: 'THB', JP: 'JPY', CN: 'CNY', KR: 'KRW', TR: 'TRY',
  RU: 'RUB', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN',
  ZA: 'ZAR', NG: 'NGN', EG: 'EGP', KE: 'KES', BR: 'BRL', MX: 'MXN', AR: 'ARS',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR',
  PT: 'EUR', AT: 'EUR', GR: 'EUR', IE: 'EUR', FI: 'EUR'
};

// ─── Currency Utils ───────────────────────────────────────────────────────────
const Currency = {
  // Load cached live rates from storage immediately on evaluation
  loadCachedRates() {
    try {
      const cached = localStorage.getItem('bs_live_currency_rates');
      if (cached) {
        const ratesObj = JSON.parse(cached);
        for (const [code, r] of Object.entries(ratesObj)) {
          if (CURRENCY_RATES[code]) {
            CURRENCY_RATES[code].rate = typeof r === 'number' ? r : (r.rate || CURRENCY_RATES[code].rate);
          }
        }
      }
      const s = DB.getCurrencySettings ? DB.getCurrencySettings() : null;
      if (s && s.rates) {
        for (const [code, r] of Object.entries(s.rates)) {
          if (CURRENCY_RATES[code]) {
            const val = typeof r === 'number' ? r : (r.rate || CURRENCY_RATES[code].rate);
            if (!isNaN(val) && val > 0) CURRENCY_RATES[code].rate = val;
          }
        }
      }
    } catch(e) {}
  },

  // Auto-sync live exchange rates seamlessly with real-time markets
  async syncLiveRates(force = false) {
    const lastSyncTime = parseInt(localStorage.getItem('bs_currency_sync_time') || '0', 10);
    const now = Date.now();
    // Cache for 30 minutes unless forced
    if (!force && now - lastSyncTime < 30 * 60 * 1000) {
      return { success: true, cached: true, lastSync: this.getLastSync() };
    }

    let rates = null;
    let syncTimestamp = new Date().toISOString();

    // 1. Try local full-stack backend endpoint first
    try {
      const res = await fetch('/api/currencies', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        if (data.currencies) {
          rates = {};
          for (const [k, v] of Object.entries(data.currencies)) {
            rates[k] = v.rate !== undefined ? v.rate : v;
          }
          if (data.lastSync) syncTimestamp = data.lastSync;
        }
      }
    } catch(e) {}

    // 2. Direct external open real-time rates API fallback (Open Exchange API, free & fast)
    if (!rates) {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates) rates = data.rates;
        }
      } catch(e) {}
    }

    // 3. Fallback open exchange-rate API
    if (!rates) {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates) rates = data.rates;
        }
      } catch(e) {}
    }

    if (rates) {
      for (const [code, rawRate] of Object.entries(rates)) {
        if (CURRENCY_RATES[code]) {
          const rateVal = typeof rawRate === 'number' ? rawRate : parseFloat(rawRate);
          if (!isNaN(rateVal) && rateVal > 0) {
            CURRENCY_RATES[code].rate = rateVal < 1 ? parseFloat(rateVal.toFixed(4)) : (rateVal < 10 ? parseFloat(rateVal.toFixed(3)) : parseFloat(rateVal.toFixed(2)));
          }
        }
      }

      try {
        localStorage.setItem('bs_live_currency_rates', JSON.stringify(CURRENCY_RATES));
        localStorage.setItem('bs_currency_sync_time', String(now));
        localStorage.setItem('bs_currency_last_sync_date', syncTimestamp);
      } catch(e) {}

      if (typeof updateAllPrices === 'function') {
        updateAllPrices();
      }
      return { success: true, updated: true, lastSync: this.getLastSync(), rates: CURRENCY_RATES };
    }

    return { success: false, error: 'Could not fetch live exchange rates' };
  },

  getLastSync() {
    try {
      const raw = localStorage.getItem('bs_currency_last_sync_date');
      if (raw) return new Date(raw).toLocaleString();
    } catch(e) {}
    return 'Live Market Rate (Today)';
  },

  getSelected() {
    const s = DB.getCurrencySettings();
    if (s.selectedManually && s.selected) {
      return s.selected;
    }
    const u = DB.getCurrentUser();
    if (u && u.currency) {
      return u.currency;
    }
    return s.selected || 'USD';
  },
  setSelected(code) {
    const s = DB.getCurrencySettings();
    DB.saveCurrencySettings({ ...s, selected: code, selectedManually: true });
    const u = DB.getCurrentUser();
    if (u) {
      u.currency = code;
      const users = DB.getUsers();
      const idx = users.findIndex(x => x.id === u.id);
      if (idx > -1) { users[idx].currency = code; DB.saveUsers(users); }
      DB.setCurrentUser(u);
    }
    if (typeof updateAllPrices === 'function') updateAllPrices();
    const sel = document.getElementById('currency-selector');
    if (sel) sel.value = code;
  },
  // Dynamically update and persist single currency rate globally
  setRate(code, newRate) {
    code = (code || '').toUpperCase();
    const rateVal = parseFloat(newRate);
    if (!CURRENCY_RATES[code] || isNaN(rateVal) || rateVal <= 0) return false;
    CURRENCY_RATES[code].rate = rateVal;
    try {
      localStorage.setItem('bs_live_currency_rates', JSON.stringify(CURRENCY_RATES));
      const s = DB.getCurrencySettings();
      s.rates = CURRENCY_RATES;
      DB.saveCurrencySettings(s);
      localStorage.setItem('bs_currency_last_sync_date', new Date().toISOString());
    } catch(e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bs_currency_updated', { detail: { code, rate: rateVal, rates: CURRENCY_RATES } }));
    }
    if (typeof updateAllPrices === 'function') updateAllPrices();
    return true;
  },

  // Save all custom currency rates and trigger global price update
  saveAllRates(ratesMap) {
    for (const [code, info] of Object.entries(ratesMap)) {
      if (CURRENCY_RATES[code]) {
        const val = typeof info === 'number' ? info : parseFloat(info.rate);
        if (!isNaN(val) && val > 0) CURRENCY_RATES[code].rate = val;
      }
    }
    try {
      localStorage.setItem('bs_live_currency_rates', JSON.stringify(CURRENCY_RATES));
      const s = DB.getCurrencySettings();
      s.rates = CURRENCY_RATES;
      DB.saveCurrencySettings(s);
      localStorage.setItem('bs_currency_last_sync_date', new Date().toISOString());
    } catch(e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bs_currency_updated', { detail: { rates: CURRENCY_RATES } }));
    }
    if (typeof updateAllPrices === 'function') updateAllPrices();
    return true;
  },

  // Country-Wise Regional Book Price Resolver (Custom Fixed Price per Country/Currency OR Standard Rate)
  getBookPrice(book, currencyCode) {
    currencyCode = currencyCode || this.getSelected();
    if (!book) return { price: 0, formatted: '$0.00', symbol: '$', rate: 1, isCustom: false, mode: 'standard' };
    const r = this.getInfo(currencyCode);
    const baseUSD = parseFloat(book.priceUSD) || 0;
    const standardConverted = parseFloat((baseUSD * r.rate).toFixed(2));

    // Check if this book has an admin-set custom price for this country/currency
    if (book.countryPricing && book.countryPricing[currencyCode] !== undefined && book.countryPricing[currencyCode] !== null && book.countryPricing[currencyCode] !== '') {
      const customPrice = parseFloat(book.countryPricing[currencyCode]);
      if (!isNaN(customPrice) && customPrice >= 0) {
        return {
          price: customPrice,
          formatted: `${r.symbol}${customPrice.toFixed(2)}`,
          standardPrice: standardConverted,
          isCustom: true,
          mode: 'custom_fixed',
          symbol: r.symbol,
          rate: r.rate,
          currency: currencyCode,
          diff: parseFloat((customPrice - standardConverted).toFixed(2))
        };
      }
    }

    // Standard live rate conversion
    return {
      price: standardConverted,
      formatted: `${r.symbol}${standardConverted.toFixed(2)}`,
      standardPrice: standardConverted,
      isCustom: false,
      mode: 'standard',
      symbol: r.symbol,
      rate: r.rate,
      currency: currencyCode,
      diff: 0
    };
  },

  convert(usdPrice, currencyCode) {
    const rates = CURRENCY_RATES;
    const r = rates[currencyCode] || rates['USD'];
    return (usdPrice * r.rate).toFixed(2);
  },
  format(usdPrice, currencyCode, book = null) {
    currencyCode = currencyCode || this.getSelected();
    if (book) {
      return this.getBookPrice(book, currencyCode).formatted;
    }
    const rates = CURRENCY_RATES;
    const r = rates[currencyCode] || rates['USD'];
    const amount = (usdPrice * r.rate).toFixed(2);
    return `${r.symbol}${amount}`;
  },
  formatSelected(usdPrice, book = null) {
    return this.format(usdPrice, this.getSelected(), book);
  },
  getInfo(code) { return CURRENCY_RATES[code] || CURRENCY_RATES['USD']; },
  getCurrencyByCountry(code) { return COUNTRY_CURRENCY[code] || 'USD'; },
  getCountryList() {
    return [
      { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', dialCode: '+91' },
      { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', dialCode: '+1' },
      { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', dialCode: '+44' },
      { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED', dialCode: '+971' },
      { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', dialCode: '+966' },
      { code: 'PK', name: 'Pakistan', flag: '🇵🇰', currency: 'PKR', dialCode: '+92' },
      { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', currency: 'BDT', dialCode: '+880' },
      { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', dialCode: '+1' },
      { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD', dialCode: '+61' },
      { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', dialCode: '+49' },
      { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', dialCode: '+33' },
      { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR', dialCode: '+34' },
      { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR', dialCode: '+39' },
      { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR', dialCode: '+31' },
      { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD', dialCode: '+65' },
      { code: 'MY', name: 'Malaysia', flag: '🇲🇾', currency: 'MYR', dialCode: '+60' },
      { code: 'ID', name: 'Indonesia', flag: '🇮🇩', currency: 'IDR', dialCode: '+62' },
      { code: 'PH', name: 'Philippines', flag: '🇵🇭', currency: 'PHP', dialCode: '+63' },
      { code: 'TH', name: 'Thailand', flag: '🇹🇭', currency: 'THB', dialCode: '+66' },
      { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY', dialCode: '+81' },
      { code: 'CN', name: 'China', flag: '🇨🇳', currency: 'CNY', dialCode: '+86' },
      { code: 'KR', name: 'South Korea', flag: '🇰🇷', currency: 'KRW', dialCode: '+82' },
      { code: 'TR', name: 'Turkey', flag: '🇹🇷', currency: 'TRY', dialCode: '+90' },
      { code: 'RU', name: 'Russia', flag: '🇷🇺', currency: 'RUB', dialCode: '+7' },
      { code: 'CH', name: 'Switzerland', flag: '🇨🇭', currency: 'CHF', dialCode: '+41' },
      { code: 'SE', name: 'Sweden', flag: '🇸🇪', currency: 'SEK', dialCode: '+46' },
      { code: 'NO', name: 'Norway', flag: '🇳🇴', currency: 'NOK', dialCode: '+47' },
      { code: 'DK', name: 'Denmark', flag: '🇩🇰', currency: 'DKK', dialCode: '+45' },
      { code: 'PL', name: 'Poland', flag: '🇵🇱', currency: 'PLN', dialCode: '+48' },
      { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR', dialCode: '+27' },
      { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', dialCode: '+234' },
      { code: 'EG', name: 'Egypt', flag: '🇪🇬', currency: 'EGP', dialCode: '+20' },
      { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', dialCode: '+254' },
      { code: 'BR', name: 'Brazil', flag: '🇧🇷', currency: 'BRL', dialCode: '+55' },
      { code: 'MX', name: 'Mexico', flag: '🇲🇽', currency: 'MXN', dialCode: '+52' },
      { code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'ARS', dialCode: '+54' },
      { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', currency: 'NZD', dialCode: '+64' },
      { code: 'QA', name: 'Qatar', flag: '🇶🇦', currency: 'QAR', dialCode: '+974' },
      { code: 'OM', name: 'Oman', flag: '🇴🇲', currency: 'OMR', dialCode: '+968' },
      { code: 'KW', name: 'Kuwait', flag: '🇰🇼', currency: 'KWD', dialCode: '+965' },
      { code: 'BH', name: 'Bahrain', flag: '🇧🇭', currency: 'BHD', dialCode: '+973' }
    ];
  },
  getAllCurrencies() { return CURRENCY_RATES; },
  getAll() { return CURRENCY_RATES; },
  async detectCountry() {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      const countryCode = data.country_code;
      const currency = COUNTRY_CURRENCY[countryCode] || 'USD';
      DB.saveCurrencySettings({ ...DB.getCurrencySettings(), autoDetected: currency, detectedCountry: data.country_name });
      return { currency, country: data.country_name, countryCode };
    } catch {
      const tzMap = {
        'Asia/Calcutta': 'INR', 'Asia/Kolkata': 'INR', 'Asia/Karachi': 'PKR', 'Asia/Dhaka': 'BDT',
        'Asia/Dubai': 'AED', 'Asia/Riyadh': 'SAR', 'Asia/Qatar': 'QAR', 'Asia/Kuwait': 'KWD',
        'Europe/London': 'GBP', 'America/New_York': 'USD', 'America/Chicago': 'USD',
        'America/Los_Angeles': 'USD', 'America/Toronto': 'CAD', 'Australia/Sydney': 'AUD',
        'Asia/Tokyo': 'JPY', 'Asia/Singapore': 'SGD', 'Asia/Kuala_Lumpur': 'MYR'
      };
      const tz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
      const fallbackCurr = tzMap[tz] || 'USD';
      return { currency: fallbackCurr, country: 'Auto-detected', countryCode: 'AUTO' };
    }
  }
};

// Immediate evaluation: load cached live rates and start non-blocking live sync
try {
  Currency.loadCachedRates();
  if (typeof window !== 'undefined') {
    Currency.syncLiveRates().catch(() => {});
  }
} catch(e) {}

// ─── Seed initial data ────────────────────────────────────────────────────────
function seedData() {
  // Seed admin user
  if (!DB.getUsers().find(u => u.role === 'admin')) {
    DB.addUser({ name: 'Admin', email: 'admin@booksaw.com', password: 'admin123', role: 'admin' });
  }

  // Seed default client reader user
  if (!DB.getUsers().find(u => u.email === 'client@example.com')) {
    DB.addUser({
      name: 'Sarah Jenkins',
      email: 'client@example.com',
      password: 'client123',
      role: 'customer',
      phone: '+1 234 567 8900',
      country: 'US',
      currency: 'USD',
      library: [1, 2, 4]
    });
  }

  // Seed books
  if (DB.getBooks().length === 0) {
    const books = [
      {
        title: 'Simple Way of Peaceful Life', author: 'Armor Ramsey', priceUSD: 40, category: 'lifestyle', genre: 'Self-Help',
        description: 'A transformative guide to living peacefully in a chaotic world. Discover mindfulness techniques and simple daily practices.',
        image: 'images/product-item1.jpg', stock: 999, featured: true, rating: 4.5, reviews: 128,
        format: 'PDF E-Book (Digital Edition)', fileSize: '9.4 MB', pages: 264, instantDelivery: true,
        sampleContent: 'Peace is not the absence of trouble, but the presence of serenity in the midst of it. When we slow down our breath and align our priorities, everyday life becomes a source of boundless joy.'
      },
      {
        title: 'Great Travel at Desert', author: 'Sanchit Howdy', priceUSD: 26, originalPriceUSD: 35, discountPercent: 26, onOffer: true, category: 'adventure', genre: 'Adventure',
        description: 'An epic journey through the golden sands of the Sahara desert. Experience the thrill of exploration and ancient wonders.',
        image: 'images/product-item2.jpg', stock: 999, featured: true, rating: 4.2, reviews: 89,
        format: 'PDF E-Book (Digital Edition)', fileSize: '14.2 MB', pages: 310, instantDelivery: true,
        sampleContent: 'The desert does not reveal its secrets willingly. You must listen to the wind across the dunes and learn the ancient navigation of the stars.'
      },
      {
        title: 'The Lady Beauty Scarlett', author: 'Arthur Doyle', priceUSD: 45, category: 'romantic', genre: 'Romance',
        description: 'A beautiful love story set in Victorian England. A tale of passion, loss, and rediscovery under the London skies.',
        image: 'images/product-item3.jpg', stock: 999, featured: true, rating: 4.7, reviews: 234,
        format: 'PDF E-Book (Digital Edition)', fileSize: '8.1 MB', pages: 288, instantDelivery: true,
        sampleContent: 'Beneath the gaslit lanterns of cobblestone streets, their eyes met across the crowded ballroom. It was a glance that would forever reshape two destinies.'
      },
      {
        title: 'Once Upon a Time', author: 'Klein Marry', priceUSD: 28, originalPriceUSD: 38, discountPercent: 26, onOffer: true, category: 'fictional', genre: 'Fiction',
        description: 'A magical tale that transports you to a world where fairy tales come alive with modern wit and wonder.',
        image: 'images/product-item4.jpg', stock: 999, featured: true, rating: 4.3, reviews: 156,
        format: 'PDF E-Book (Digital Edition)', fileSize: '11.5 MB', pages: 340, instantDelivery: true,
        sampleContent: 'Legends say that mirrors in the high tower don’t reflect who you are today, but who you are destined to become once your courage is tested.'
      },
      {
        title: 'Portrait Photography', author: 'Adam Silber', priceUSD: 40, category: 'technology', genre: 'Photography',
        description: 'Master the art of portrait photography with professional lighting techniques, aperture mastery, and real-world studio examples.',
        image: 'images/tab-item1.jpg', stock: 999, featured: false, rating: 4.6, reviews: 98,
        format: 'PDF E-Book (Digital Edition)', fileSize: '22.8 MB', pages: 196, instantDelivery: true,
        sampleContent: 'A photograph is not made with the camera; it is made with the eye, heart, and the ability to capture an authentic human emotion in a fraction of a second.'
      },
      {
        title: 'Tips of Simple Lifestyle', author: 'Bratt Smith', priceUSD: 40, category: 'lifestyle', genre: 'Self-Help',
        description: 'Practical tips for embracing minimalism, decluttering your mental space, and finding lasting joy in everyday moments.',
        image: 'images/tab-item3.jpg', stock: 999, featured: false, rating: 4.1, reviews: 67,
        format: 'PDF E-Book (Digital Edition)', fileSize: '7.8 MB', pages: 215, instantDelivery: true,
        sampleContent: 'Clutter is not just physical objects; it is postponed decisions. When you clear your physical and mental space, freedom naturally follows.'
      },
      {
        title: 'Just Felt from Outside', author: 'Nicole Wilson', priceUSD: 40, category: 'fictional', genre: 'Fiction',
        description: 'A philosophical novel exploring the feeling of being an outsider in society and finding belonging in unexpected places.',
        image: 'images/tab-item4.jpg', stock: 999, featured: false, rating: 4.4, reviews: 112,
        format: 'PDF E-Book (Digital Edition)', fileSize: '10.2 MB', pages: 320, instantDelivery: true,
        sampleContent: 'Standing outside looking in, you notice nuances that those inside have long grown blind to. This is the superpower of the observer.'
      },
      {
        title: 'Peaceful Enlightenment', author: 'Marmik Lama', priceUSD: 32, originalPriceUSD: 42, discountPercent: 24, onOffer: true, category: 'lifestyle', genre: 'Spirituality',
        description: 'A journey into inner peace through Eastern philosophy, mindfulness meditation, and modern cognitive psychology.',
        image: 'images/tab-item5.jpg', stock: 999, featured: false, rating: 4.8, reviews: 189,
        format: 'PDF E-Book (Digital Edition)', fileSize: '8.9 MB', pages: 275, instantDelivery: true,
        sampleContent: 'You cannot calm the storm by shouting at the waves. You must anchor your soul in the stillness that lies beneath the surface.'
      },
      {
        title: 'Life Among the Pirates', author: 'Armor Ramsey', priceUSD: 40, category: 'adventure', genre: 'Adventure',
        description: 'A swashbuckling adventure on the high seas of the Caribbean. Follow historical buccaneers and hidden treasure legends.',
        image: 'images/tab-item7.jpg', stock: 999, featured: false, rating: 4.0, reviews: 78,
        format: 'PDF E-Book (Digital Edition)', fileSize: '13.4 MB', pages: 360, instantDelivery: true,
        sampleContent: 'The skull flag fluttered on the horizon. The captain raised his spyglass and grinned: uncharted waters were always where fortunes were won.'
      },
      {
        title: 'Birds Gonna Be Happy', author: 'Timbur Hood', priceUSD: 45, originalPriceUSD: 55, discountPercent: 18, onOffer: true, category: 'nature', genre: 'Nature',
        description: 'The best-selling guide to bird watching, ecological preservation, and appreciating avian wonders in your own backyard.',
        image: 'images/single-image.jpg', stock: 999, featured: true, rating: 4.9, reviews: 301, bestSeller: true,
        format: 'PDF E-Book (Digital Edition)', fileSize: '16.5 MB', pages: 298, instantDelivery: true,
        sampleContent: 'A bird does not sing because it has an answer; it sings because it has a song. When we tune our ears to the morning chorus, the whole world comes alive.'
      }
    ];
    books.forEach(b => DB.addBook(b));
  } else {
    // Migrate existing books with digital PDF properties & promotional sales
    const existing = DB.getBooks();
    let changed = false;
    existing.forEach((b, i) => {
      if (!b.format || b.format.includes('KDP')) { b.format = 'PDF E-Book (Digital Edition)'; changed = true; }
      if (!b.fileSize) { b.fileSize = `${(8 + (i * 1.5)).toFixed(1)} MB`; changed = true; }
      if (!b.pages) { b.pages = 220 + (i * 24); changed = true; }
      if (b.instantDelivery === undefined) { b.instantDelivery = true; changed = true; }
      if (b.stock < 100) { b.stock = 999; changed = true; }
      // Books on sale setup
      if (b.id === 2 || b.title === 'Great Travel at Desert') {
        b.onOffer = true; b.originalPriceUSD = 35; b.priceUSD = 26; b.discountPercent = 26; changed = true;
      }
      if (b.id === 4 || b.title === 'Once Upon a Time') {
        b.onOffer = true; b.originalPriceUSD = 38; b.priceUSD = 28; b.discountPercent = 26; changed = true;
      }
      if (b.id === 8 || b.title === 'Peaceful Enlightenment') {
        b.onOffer = true; b.originalPriceUSD = 42; b.priceUSD = 32; b.discountPercent = 24; changed = true;
      }
      if (b.id === 10 || b.title === 'Birds Gonna Be Happy') {
        b.onOffer = true; b.originalPriceUSD = 55; b.priceUSD = 45; b.discountPercent = 18; changed = true;
      }
    });
    if (changed) DB.saveBooks(existing);
  }

  // Seed blogs
  if (DB.getBlogs().length === 0) {
    const blogs = [
      { title: 'Top 10 Books to Read in 2025', excerpt: 'Discover the most anticipated books of the year that every reader must have on their shelf.', content: '<p>Reading is one of the most enriching activities you can do. Here are our top picks for 2025...</p><p>1. <strong>The Midnight Library</strong> - A beautiful story about life choices and second chances.</p><p>2. <strong>Project Hail Mary</strong> - A brilliant sci-fi novel about humanity\'s survival.</p><p>3. <strong>The Invisible Life of Addie LaRue</strong> - A magical tale spanning centuries.</p>', image: 'images/post-img1.jpg', author: 'Admin', category: 'Reading Lists', tags: ['books', 'reading', '2025'], published: true },
      { title: 'How Reading Changes Your Brain', excerpt: 'Science has proven that regular reading has profound effects on brain structure and function.', content: '<p>Scientific research consistently shows that reading is one of the best exercises for your brain...</p><p>Reading fiction improves empathy and social understanding. Non-fiction expands your knowledge base.</p>', image: 'images/post-img2.jpg', author: 'Admin', category: 'Science', tags: ['science', 'brain', 'reading'], published: true },
      { title: 'The Art of Building a Home Library', excerpt: 'Transform your living space into a literary sanctuary with these expert tips for curating your personal library.', content: '<p>A home library is more than just a collection of books — it\'s a reflection of who you are...</p><p>Start by categorizing your books by genre, then author. Use vertical space with tall bookshelves.</p>', image: 'images/post-img3.jpg', author: 'Admin', category: 'Lifestyle', tags: ['library', 'home', 'books'], published: true }
    ];
    blogs.forEach(b => DB.addBlog(b));
  }
}

// Initialize
seedData();
