/**
 * BookSaw Persistent Backend Database Engine
 * Stores data in JSON format on disk: backend/data/database.json
 * Automatically seeds default books, admin user, currencies, and settings on first run.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed dataset
const SEED_DATA = {
  settings: {
    siteName: 'BookSaw',
    siteTagline: 'Instant PDF E-Books & Online Digital Reader',
    currency: 'USD',
    taxRate: 0,
    shippingFee: 0,
    freeShippingAbove: 0,
    deliveryType: 'instant_digital'
  },
  users: [
    {
      id: 1,
      name: 'System Admin',
      email: 'admin@booksaw.com',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
      library: [], // Array of book IDs purchased by this user
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      name: 'John Reader',
      email: 'client@example.com',
      passwordHash: hashPassword('client123'),
      role: 'customer',
      library: [1], // Has purchased book #1
      createdAt: new Date().toISOString()
    }
  ],
  books: [
    {
      id: 1,
      title: 'Simple Way of Peaceful Life',
      author: 'Armor Ramsey',
      priceUSD: 40,
      category: 'lifestyle',
      genre: 'Self-Help',
      description: 'A transformative guide to living peacefully in a chaotic world. Discover mindfulness techniques and simple daily practices.',
      image: 'images/product-item1.jpg',
      stock: 999,
      featured: true,
      rating: 4.5,
      reviews: 128,
      format: 'PDF E-Book (Digital Edition)',
      fileSize: '9.4 MB',
      pages: 264,
      instantDelivery: true,
      sampleContent: 'Peace is not the absence of trouble, but the presence of serenity in the midst of it. When we slow down our breath and align our priorities, everyday life becomes a source of boundless joy.',
      fullContent: [
        'Chapter 1: The Still Mind. Peace is not the absence of trouble, but the presence of serenity in the midst of it.',
        'Chapter 2: The Art of Breathing. Every conscious breath dissolves lingering anxieties and reconnects the nervous system to the present moment.',
        'Chapter 3: Mindful Morning Rituals. How you greet the sunrise determines how you process the obstacles of the afternoon.',
        'Chapter 4: Digital Minimalism. Turning down the constant notification buzz creates fertile ground for creative breakthroughs.',
        'Chapter 5: Gratitude as a Habit. Write down three unexpected blessings each evening to rewire cognitive positivity.',
        'Chapter 6: Serenity in Solitude. Walking alone in nature teaches us the quiet rhythm that restores the soul.'
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      title: 'Great Travel at Desert',
      author: 'Sanchit Howdy',
      priceUSD: 38,
      category: 'adventure',
      genre: 'Adventure',
      description: 'An epic journey through the golden sands of the Sahara desert. Experience the thrill of exploration and ancient wonders.',
      image: 'images/product-item2.jpg',
      stock: 999,
      featured: true,
      rating: 4.2,
      reviews: 89,
      format: 'PDF E-Book (Digital Edition)',
      fileSize: '14.2 MB',
      pages: 310,
      instantDelivery: true,
      sampleContent: 'The desert does not reveal its secrets willingly. You must listen to the wind across the dunes and learn the ancient navigation of the stars.',
      fullContent: [
        'Prologue: The Golden Horizon. The desert does not reveal its secrets willingly.',
        'Chapter 1: Preparing the Caravan. Salt, water, dried dates, and compass readings.',
        'Chapter 2: The Oasis of Zagora. Palm fronds whispering ancient Berber folklore.',
        'Chapter 3: Crossing the Sand Sea. When dunes rise like golden tidal waves under blistering heat.',
        'Chapter 4: Stargazing in the Sahara. The celestial compass that guided caravans for ten centuries.',
        'Chapter 5: Lost City in the Mirage. Finding forgotten trade outposts buried under sand.'
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      title: 'The Lady Beauty Scarlett',
      author: 'Arthur Doyle',
      priceUSD: 45,
      category: 'romantic',
      genre: 'Romance',
      description: 'A beautiful love story set in Victorian England. A tale of passion, loss, and rediscovery under the London skies.',
      image: 'images/product-item3.jpg',
      stock: 999,
      featured: true,
      rating: 4.7,
      reviews: 234,
      format: 'PDF E-Book (Digital Edition)',
      fileSize: '8.1 MB',
      pages: 288,
      instantDelivery: true,
      sampleContent: 'Beneath the gaslit lanterns of cobblestone streets, their eyes met across the crowded ballroom. It was a glance that would forever reshape two destinies.',
      fullContent: [
        'Chapter 1: The Gaslit Ball. Beneath the gaslit lanterns of cobblestone streets, their eyes met.',
        'Chapter 2: Letters Across Mayfair. Wax-sealed envelopes carried by hurried footmen.',
        'Chapter 3: Kensington Gardens at Twilight. Secret meetings amidst blooming lilacs.',
        'Chapter 4: The Threat of Betrothal. Family fortunes clashing with unspoken devotions.',
        'Chapter 5: Midnight at Thames Embankment. Choosing love over aristocratic legacy.'
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 4,
      title: 'Once Upon a Time',
      author: 'Klein Marry',
      priceUSD: 35,
      category: 'fictional',
      genre: 'Fiction',
      description: 'A magical tale that transports you to a world where fairy tales come alive with modern wit and wonder.',
      image: 'images/product-item4.jpg',
      stock: 999,
      featured: true,
      rating: 4.3,
      reviews: 156,
      format: 'PDF E-Book (Digital Edition)',
      fileSize: '11.5 MB',
      pages: 340,
      instantDelivery: true,
      sampleContent: 'Legends say that mirrors in the high tower don’t reflect who you are today, but who you are destined to become once your courage is tested.',
      fullContent: [
        'Chapter 1: The Mirror in the Tower. Legends say that mirrors in the high tower reflect your destiny.',
        'Chapter 2: Whispers in the Clockwork Forest. Trees of brass and leaves of woven silver.',
        'Chapter 3: The Riddle of the Moonstone. Three answers that unlock the obsidian gate.',
        'Chapter 4: Flying Above Cloudsea. Riding winged galleons into the twilight storm.',
        'Chapter 5: The Spell Broken. Returning to earth with memories written in starlight.'
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 5,
      title: 'Portrait Photography',
      author: 'Adam Silber',
      priceUSD: 40,
      category: 'technology',
      genre: 'Photography',
      description: 'Master the art of portrait photography with professional lighting techniques, aperture mastery, and real-world studio examples.',
      image: 'images/tab-item1.jpg',
      stock: 999,
      featured: false,
      rating: 4.6,
      reviews: 98,
      format: 'PDF E-Book (Digital Edition)',
      fileSize: '22.8 MB',
      pages: 196,
      instantDelivery: true,
      sampleContent: 'A photograph is not made with the camera; it is made with the eye, heart, and the ability to capture an authentic human emotion in a fraction of a second.',
      fullContent: [
        'Module 1: The Essence of the Face. Capturing authentic human emotion.',
        'Module 2: The Three-Point Lighting Setup. Key, fill, and rim light positioning.',
        'Module 3: Lens Selection for Flattering Perspectives. Why 85mm and 105mm reign supreme.',
        'Module 4: Environmental Portraits. Blending the subject with their craft and surroundings.',
        'Module 5: Color Grading and Skin Tone Retouching in Post-Production.'
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 6,
      title: 'Tips of Simple Lifestyle',
      author: 'Bratt Smith',
      priceUSD: 40,
      category: 'lifestyle',
      genre: 'Self-Help',
      description: 'Practical tips for embracing minimalism, decluttering your mental space, and finding lasting joy in everyday moments.',
      image: 'images/tab-item3.jpg',
      stock: 999,
      featured: false,
      rating: 4.1,
      reviews: 67,
      format: 'PDF E-Book (Digital Edition)',
      fileSize: '7.8 MB',
      pages: 215,
      instantDelivery: true,
      sampleContent: 'Clutter is not just physical objects; it is postponed decisions. When you clear your physical and mental space, freedom naturally follows.',
      fullContent: [
        'Section 1: Postponed Decisions. Why clutter drains creative energy.',
        'Section 2: The 30-Day Purge. One room, one drawer, one mindful hour at a time.',
        'Section 3: The Capsule Wardrobe. Quality essentials over transient trends.',
        'Section 4: Financial Serenity. Aligning expenditures with your genuine values.',
        'Section 5: Living Lightly on the Earth. Sustainable habits for peaceful living.'
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 7,
      title: 'Just Felt from Outside',
      author: 'Nicole Wilson',
      priceUSD: 40,
      category: 'fictional',
      genre: 'Fiction',
      description: 'A philosophical novel exploring the feeling of being an outsider in society and finding belonging in unexpected places.',
      image: 'images/tab-item4.jpg',
      stock: 999,
      featured: false,
      rating: 4.4,
      reviews: 112,
      format: 'PDF E-Book (Digital Edition)',
      fileSize: '10.2 MB',
      pages: 320,
      instantDelivery: true,
      sampleContent: 'Standing outside looking in, you notice nuances that those inside have long grown blind to. This is the superpower of the observer.',
      fullContent: [
        'Part 1: The Observer on the Platform. Standing outside looking in.',
        'Part 2: The Architecture of Strangers. How cities isolate and connect simultaneously.',
        'Part 3: Finding Kinship in the Margins. The poets, night-workers, and quiet dreamers.',
        'Part 4: The Courage to Belong. Stepping across the threshold on your own terms.'
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 8,
      title: 'Peaceful Enlightenment',
      author: 'Marmik Lama',
      priceUSD: 40,
      category: 'lifestyle',
      genre: 'Spirituality',
      description: 'A journey into inner peace through Eastern philosophy, mindfulness meditation, and modern cognitive psychology.',
      image: 'images/tab-item5.jpg',
      stock: 999,
      featured: false,
      rating: 4.8,
      reviews: 189,
      format: 'PDF E-Book (Digital Edition)',
      fileSize: '8.9 MB',
      pages: 275,
      instantDelivery: true,
      sampleContent: 'You cannot calm the storm by shouting at the waves. You must anchor your soul in the stillness that lies beneath the surface.',
      fullContent: [
        'Teaching 1: Anchoring Beneath the Waves. Stillness amidst chaos.',
        'Teaching 2: The Nature of Attachment. Holding experiences with open hands.',
        'Teaching 3: Compassion for the Inner Critic. Transforming self-judgment into gentle wisdom.',
        'Teaching 4: Living the Dharma in Modern Times. Mindfulness on the subway and in meetings.'
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 9,
      title: 'Life Among the Pirates',
      author: 'Armor Ramsey',
      priceUSD: 40,
      category: 'adventure',
      genre: 'Adventure',
      description: 'A swashbuckling adventure on the high seas of the Caribbean. Follow historical buccaneers and hidden treasure legends.',
      image: 'images/tab-item7.jpg',
      stock: 999,
      featured: false,
      rating: 4.0,
      reviews: 78,
      format: 'PDF E-Book (Digital Edition)',
      fileSize: '13.4 MB',
      pages: 360,
      instantDelivery: true,
      sampleContent: 'The skull flag fluttered on the horizon. The captain raised his spyglass and grinned: uncharted waters were always where fortunes were won.',
      fullContent: [
        'Chapter 1: The Black Sails. Uncharted waters where fortunes were won.',
        'Chapter 2: Port Royal at Midnight. Taverns thick with salt, rum, and conspiracy.',
        'Chapter 3: The Spanish Galleon Encounter. Cannons roaring across the turquoise surf.',
        'Chapter 4: The Island of Skeletons. Decoding cipher maps etched on silver coins.'
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 10,
      title: 'Birds Gonna Be Happy',
      author: 'Timbur Hood',
      priceUSD: 45,
      category: 'nature',
      genre: 'Nature',
      description: 'The best-selling guide to bird watching, ecological preservation, and appreciating avian wonders in your own backyard.',
      image: 'images/single-image.jpg',
      stock: 999,
      featured: true,
      rating: 4.9,
      reviews: 301,
      bestSeller: true,
      originalPriceUSD: 55,
      onOffer: true,
      format: 'PDF E-Book (Digital Edition)',
      fileSize: '16.5 MB',
      pages: 298,
      instantDelivery: true,
      sampleContent: 'A bird does not sing because it has an answer; it sings because it has a song. When we tune our ears to the morning chorus, the whole world comes alive.',
      fullContent: [
        'Chapter 1: The Morning Chorus. Why birds sing at the break of dawn.',
        'Chapter 2: Backyard Avian Sanctuaries. Feeders, native shrubs, and water baths.',
        'Chapter 3: Identifying Feathers and Flight Patterns. Warblers, raptors, and finches.',
        'Chapter 4: The Wonders of Global Migration. Flying 7,000 miles without a single stop.',
        'Chapter 5: Preserving Wetlands and Sanctuaries for Future Generations.'
      ],
      createdAt: new Date().toISOString()
    }
  ],
  orders: [
    {
      id: 1001,
      userId: 2,
      customerName: 'John Reader',
      customerEmail: 'client@example.com',
      items: [
        {
          bookId: 1,
          title: 'Simple Way of Peaceful Life',
          priceUSD: 40,
          qty: 1,
          format: 'PDF E-Book'
        }
      ],
      totalUSD: 40,
      currency: 'USD',
      paymentMethod: 'Credit Card',
      paymentStatus: 'paid',
      status: 'completed',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    }
  ],
  blogs: [
    {
      id: 1,
      title: 'Top 10 Books to Read in 2025',
      excerpt: 'Discover the most anticipated books of the year that every reader must have on their shelf.',
      content: '<p>Reading is one of the most enriching activities you can do. Here are our top picks for 2025...</p><p>1. <strong>The Midnight Library</strong> - A beautiful story about life choices and second chances.</p><p>2. <strong>Project Hail Mary</strong> - A brilliant sci-fi novel about humanity\'s survival.</p>',
      image: 'images/post-img1.jpg',
      author: 'Admin',
      category: 'Reading Lists',
      tags: ['books', 'reading', '2025'],
      published: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      title: 'How Reading Changes Your Brain',
      excerpt: 'Science has proven that regular reading has profound effects on brain structure and function.',
      content: '<p>Scientific research consistently shows that reading is one of the best exercises for your brain...</p><p>Reading fiction improves empathy and social understanding.</p>',
      image: 'images/post-img2.jpg',
      author: 'Admin',
      category: 'Science',
      tags: ['science', 'brain', 'reading'],
      published: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      title: 'The Art of Building a Home Library',
      excerpt: 'Transform your living space into a literary sanctuary with these expert tips for curating your personal library.',
      content: '<p>A home library is more than just a collection of books — it\'s a reflection of who you are...</p><p>Categorize your books by genre and author for easy browsing.</p>',
      image: 'images/post-img3.jpg',
      author: 'Admin',
      category: 'Lifestyle',
      tags: ['library', 'home', 'books'],
      published: true,
      createdAt: new Date().toISOString()
    }
  ],
  currencies: {
    USD: { symbol: '$', rate: 1, name: 'US Dollar', flag: '🇺🇸' },
    EUR: { symbol: '€', rate: 0.92, name: 'Euro', flag: '🇪🇺' },
    GBP: { symbol: '£', rate: 0.79, name: 'British Pound', flag: '🇬🇧' },
    INR: { symbol: '₹', rate: 83.5, name: 'Indian Rupee', flag: '🇮🇳' },
    PKR: { symbol: '₨', rate: 278, name: 'Pakistani Rupee', flag: '🇵🇰' },
    BDT: { symbol: '৳', rate: 110, name: 'Bangladeshi Taka', flag: '🇧🇩' },
    AED: { symbol: 'د.إ', rate: 3.67, name: 'UAE Dirham', flag: '🇦🇪' },
    SAR: { symbol: '﷼', rate: 3.75, name: 'Saudi Riyal', flag: '🇸🇦' },
    QAR: { symbol: 'QR', rate: 3.64, name: 'Qatari Riyal', flag: '🇶🇦' },
    OMR: { symbol: 'OMR', rate: 0.385, name: 'Omani Rial', flag: '🇴🇲' },
    KWD: { symbol: 'KD', rate: 0.308, name: 'Kuwaiti Dinar', flag: '🇰🇼' },
    BHD: { symbol: 'BD', rate: 0.376, name: 'Bahraini Dinar', flag: '🇧🇭' },
    CAD: { symbol: 'C$', rate: 1.36, name: 'Canadian Dollar', flag: '🇨🇦' },
    AUD: { symbol: 'A$', rate: 1.53, name: 'Australian Dollar', flag: '🇦🇺' },
    SGD: { symbol: 'S$', rate: 1.34, name: 'Singapore Dollar', flag: '🇸🇬' },
    JPY: { symbol: '¥', rate: 149, name: 'Japanese Yen', flag: '🇯🇵' },
    MYR: { symbol: 'RM', rate: 4.72, name: 'Malaysian Ringgit', flag: '🇲🇾' },
    BRL: { symbol: 'R$', rate: 4.97, name: 'Brazilian Real', flag: '🇧🇷' }
  }
};

// Helper: Hash password with SHA-256 + salt
function hashPassword(password, salt = 'booksaw_salt_2026') {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

class Database {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error loading database file, re-initializing with seed data:', e);
    }
    // Write seed data if not present
    this.saveData(SEED_DATA);
    return JSON.parse(JSON.stringify(SEED_DATA));
  }

  saveData(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  }

  save() {
    this.saveData(this.data);
  }

  // ─── Books ─────────────────────────────────────────
  getBooks() {
    return this.data.books || [];
  }

  getBook(id) {
    return this.getBooks().find(b => b.id === Number(id)) || null;
  }

  addBook(bookData) {
    const books = this.getBooks();
    const id = books.length ? Math.max(...books.map(b => b.id || 0)) + 1 : 1;
    const newBook = {
      ...bookData,
      id,
      priceUSD: Number(bookData.priceUSD) || 10,
      stock: 999,
      format: 'PDF E-Book (Digital Edition)',
      instantDelivery: true,
      createdAt: new Date().toISOString()
    };
    books.push(newBook);
    this.data.books = books;
    this.save();
    return newBook;
  }

  updateBook(id, bookData) {
    const books = this.getBooks();
    const idx = books.findIndex(b => b.id === Number(id));
    if (idx === -1) return null;
    books[idx] = {
      ...books[idx],
      ...bookData,
      id: Number(id),
      updatedAt: new Date().toISOString()
    };
    this.data.books = books;
    this.save();
    return books[idx];
  }

  deleteBook(id) {
    this.data.books = this.getBooks().filter(b => b.id !== Number(id));
    this.save();
    return true;
  }

  // ─── Users ─────────────────────────────────────────
  getUsers() {
    return this.data.users || [];
  }

  getUserById(id) {
    return this.getUsers().find(u => u.id === Number(id)) || null;
  }

  getUserByEmail(email) {
    if (!email) return null;
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
  }

  createUser({ name, email, password, role = 'customer', country = 'US', currency = 'USD', phone = '' }) {
    const existing = this.getUserByEmail(email);
    if (existing) return { error: 'An account with this email address already exists.' };

    const users = this.getUsers();
    const id = users.length ? Math.max(...users.map(u => u.id || 0)) + 1 : 1;
    const newUser = {
      id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      role,
      country,
      currency,
      phone,
      library: [], // Purchased book IDs
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    this.data.users = users;
    this.save();
    return { user: this.sanitizeUser(newUser) };
  }

  updateUser(id, data) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === Number(id));
    if (idx === -1) return null;
    if (data.name) users[idx].name = data.name.trim();
    if (data.phone !== undefined) users[idx].phone = data.phone;
    if (data.country) users[idx].country = data.country;
    if (data.currency) users[idx].currency = data.currency;
    if (data.password) users[idx].passwordHash = hashPassword(data.password);
    users[idx].updatedAt = new Date().toISOString();
    this.data.users = users;
    this.save();
    return this.sanitizeUser(users[idx]);
  }

  validateUser(email, password) {
    const user = this.getUserByEmail(email);
    if (!user) return null;
    const hash = hashPassword(password);
    if (user.passwordHash === hash) {
      return this.sanitizeUser(user);
    }
    return null;
  }

  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, ...clean } = user;
    return clean;
  }

  // ─── User Purchases & Library ───────────────────────
  // A purchased book is strictly linked to that user's ID
  getUserLibrary(userId) {
    if (!userId) return [];
    const user = this.getUserById(userId);
    if (!user) return [];
    
    const ownedIds = new Set(user.library || []);
    // Also include completed orders for this user
    const userOrders = this.getOrders().filter(o => o.userId === Number(userId) && (o.status === 'completed' || o.paymentStatus === 'paid'));
    userOrders.forEach(o => {
      (o.items || []).forEach(it => {
        if (it && it.bookId) ownedIds.add(Number(it.bookId));
      });
    });

    const bookList = this.getBooks().filter(b => ownedIds.has(b.id));
    return bookList;
  }

  isBookPurchasedByUser(userId, bookId) {
    if (!userId || !bookId) return false;
    const user = this.getUserById(userId);
    if (user && user.library && user.library.includes(Number(bookId))) return true;

    // Check completed orders
    const orders = this.getOrders();
    const hasOrder = orders.some(o => 
      o.userId === Number(userId) &&
      (o.status === 'completed' || o.paymentStatus === 'paid') &&
      (o.items || []).some(item => Number(item.bookId) === Number(bookId))
    );
    return hasOrder;
  }

  addBookToUserLibrary(userId, bookId) {
    const user = this.getUserById(userId);
    if (!user) return false;
    user.library = user.library || [];
    if (!user.library.includes(Number(bookId))) {
      user.library.push(Number(bookId));
      this.save();
    }
    return true;
  }

  // ─── Orders ─────────────────────────────────────────
  getOrders() {
    return this.data.orders || [];
  }

  getOrder(id) {
    return this.getOrders().find(o => o.id === Number(id)) || null;
  }

  createOrder({ userId, customerName, customerEmail, items, totalUSD, currency, paymentMethod, paymentStatus = 'paid', status = 'completed', transactionId = null, couponCode = null, discountUSD = 0, discountPercent = 0 }) {
    const orders = this.getOrders();
    const id = orders.length ? Math.max(...orders.map(o => o.id || 0)) + 1 : 1001;

    const newOrder = {
      id,
      userId: userId ? Number(userId) : null,
      customerName: customerName || 'Valued Customer',
      customerEmail: (customerEmail || '').toLowerCase().trim(),
      items: items || [],
      totalUSD: Number(totalUSD) || 0,
      currency: currency || 'USD',
      paymentMethod: paymentMethod || 'Credit Card',
      paymentStatus: paymentStatus, // 'paid' or 'unpaid' / 'pending'
      status: status,
      transactionId: transactionId || ('TXN_' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase()),
      couponCode: couponCode ? String(couponCode).toUpperCase() : null,
      discountUSD: Number(discountUSD) || 0,
      discountPercent: Number(discountPercent) || 0,
      createdAt: new Date().toISOString()
    };

    orders.push(newOrder);
    this.data.orders = orders;

    // CRUCIAL: ONLY unlock purchased books if paymentStatus is 'paid'!
    if (userId && paymentStatus === 'paid') {
      const bookIds = (items || []).map(i => Number(i.bookId)).filter(Boolean);
      bookIds.forEach(bId => this.addBookToUserLibrary(userId, bId));
    }

    this.save();
    return newOrder;
  }

  updateOrderStatus(id, status) {
    const orders = this.getOrders();
    const order = orders.find(o => o.id === Number(id));
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
      this.save();
      return order;
    }
    return null;
  }

  // ─── Blogs ──────────────────────────────────────────
  getBlogs() {
    return this.data.blogs || [];
  }

  addBlog(blogData) {
    const blogs = this.getBlogs();
    const id = blogs.length ? Math.max(...blogs.map(b => b.id || 0)) + 1 : 1;
    const newBlog = {
      ...blogData,
      id,
      createdAt: new Date().toISOString()
    };
    blogs.push(newBlog);
    this.data.blogs = blogs;
    this.save();
    return newBlog;
  }

  // ─── Settings & Currencies ──────────────────────────
  getSettings() {
    return this.data.settings || {};
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    return this.data.settings;
  }

  getCurrencies() {
    return this.data.currencies || {};
  }

  getCurrencyLastSync() {
    return this.data.currencyLastSync || null;
  }

  updateCurrencies(newRates) {
    if (!this.data.currencies) this.data.currencies = {};
    for (const [code, val] of Object.entries(newRates)) {
      if (this.data.currencies[code]) {
        this.data.currencies[code].rate = typeof val === 'number' ? val : (val.rate || this.data.currencies[code].rate);
      } else if (typeof val === 'object' && val.rate) {
        this.data.currencies[code] = val;
      }
    }
    this.data.currencyLastSync = new Date().toISOString();
    this.save();
    return this.data.currencies;
  }

  async syncLiveRates() {
    const https = require('https');
    const fetchJson = (urlStr) => new Promise((resolve, reject) => {
      const req = https.get(urlStr, { timeout: 8000 }, (res) => {
        if (res.statusCode !== 200) return reject(new Error('Status ' + res.statusCode));
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });

    let liveRates = null;
    try {
      const data = await fetchJson('https://open.er-api.com/v6/latest/USD');
      if (data && data.rates) liveRates = data.rates;
    } catch (e1) {
      try {
        const data2 = await fetchJson('https://api.exchangerate-api.com/v4/latest/USD');
        if (data2 && data2.rates) liveRates = data2.rates;
      } catch (e2) {
        console.error('Failed to fetch live exchange rates:', e2.message);
      }
    }

    if (!liveRates) {
      return { success: false, error: 'Could not reach exchange rate API', lastSync: this.getCurrencyLastSync(), currencies: this.getCurrencies() };
    }

    if (!this.data.currencies) this.data.currencies = {};
    let updatedCount = 0;
    for (const [code, curObj] of Object.entries(this.data.currencies)) {
      if (liveRates[code] !== undefined) {
        const rawRate = liveRates[code];
        const formattedRate = rawRate < 1 ? parseFloat(rawRate.toFixed(4)) : (rawRate < 10 ? parseFloat(rawRate.toFixed(3)) : parseFloat(rawRate.toFixed(2)));
        curObj.rate = formattedRate;
        updatedCount++;
      }
    }

    this.data.currencyLastSync = new Date().toISOString();
    this.save();
    return {
      success: true,
      updatedCount,
      lastSync: this.data.currencyLastSync,
      currencies: this.data.currencies
    };
  }

  // ─── Coupons & Promo Codes ──────────────────────────
  getCoupons() {
    if (!this.data.coupons || !this.data.coupons.length) {
      this.data.coupons = [
        {
          id: 1,
          code: 'MYBOOK10',
          discountPercent: 10,
          description: 'Special 10% Off Any Book Purchase',
          isActive: true,
          minOrderUSD: 0,
          usageCount: 0,
          createdAt: new Date().toISOString()
        }
      ];
      this.save();
    }
    return this.data.coupons;
  }

  createCoupon(data) {
    const coupons = this.getCoupons();
    const cleanCode = (data.code || '').trim().toUpperCase();
    if (!cleanCode) return null;
    if (coupons.find(c => c.code.toUpperCase() === cleanCode)) return null;

    const newCoupon = {
      id: coupons.length ? Math.max(...coupons.map(c => c.id || 0)) + 1 : 1,
      code: cleanCode,
      discountPercent: Math.max(1, Math.min(100, parseFloat(data.discountPercent) || 10)),
      description: data.description || `${data.discountPercent || 10}% Off Promo Code`,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      minOrderUSD: Math.max(0, parseFloat(data.minOrderUSD) || 0),
      usageCount: 0,
      createdAt: new Date().toISOString()
    };
    coupons.push(newCoupon);
    this.save();
    return newCoupon;
  }

  updateCoupon(id, data) {
    const coupons = this.getCoupons();
    const i = coupons.findIndex(c => c.id === parseInt(id));
    if (i > -1) {
      if (data.code) {
        const clean = data.code.trim().toUpperCase();
        const existing = coupons.find(c => c.code.toUpperCase() === clean && c.id !== parseInt(id));
        if (existing) return null;
        coupons[i].code = clean;
      }
      if (data.discountPercent !== undefined) coupons[i].discountPercent = Math.max(1, Math.min(100, parseFloat(data.discountPercent) || 10));
      if (data.description !== undefined) coupons[i].description = data.description;
      if (data.isActive !== undefined) coupons[i].isActive = Boolean(data.isActive);
      if (data.minOrderUSD !== undefined) coupons[i].minOrderUSD = Math.max(0, parseFloat(data.minOrderUSD) || 0);
      coupons[i].updatedAt = new Date().toISOString();
      this.save();
      return coupons[i];
    }
    return null;
  }

  deleteCoupon(id) {
    this.data.coupons = this.getCoupons().filter(c => c.id !== parseInt(id));
    this.save();
    return true;
  }

  validateCoupon(code, subtotalUSD = 0) {
    if (!code) return { valid: false, message: 'Please enter a coupon code.' };
    const clean = code.trim().toUpperCase();
    const coupon = this.getCoupons().find(c => c.code.toUpperCase() === clean);
    if (!coupon) return { valid: false, message: '❌ Invalid coupon code.' };
    if (!coupon.isActive) return { valid: false, message: '⚠️ This coupon code is currently disabled.' };
    if (coupon.minOrderUSD > 0 && subtotalUSD < coupon.minOrderUSD) {
      return { valid: false, message: `⚠️ Minimum order of $${coupon.minOrderUSD} required.` };
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
  }

  incrementCouponUsage(code) {
    const clean = (code || '').trim().toUpperCase();
    const coupons = this.getCoupons();
    const c = coupons.find(x => x.code.toUpperCase() === clean);
    if (c) {
      c.usageCount = (c.usageCount || 0) + 1;
      this.save();
    }
  }
}

const db = new Database();

module.exports = {
  db,
  hashPassword
};
