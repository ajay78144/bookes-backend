const bcrypt = require('bcryptjs');

const initialAdminPasswordHash = bcrypt.hashSync('admin123', 10);
const initialCustomerPasswordHash = bcrypt.hashSync('client123', 10);

const getInitialSeedData = () => ({
  settings: {
    siteName: 'BookSaw',
    siteTagline: 'Instant PDF E-Books & Online Digital Reader',
    defaultCurrency: 'USD',
    taxRate: 5,
    shippingFee: 0,
    freeShippingAbove: 50,
    exchangeRates: {
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.79,
      INR: 83.5,
      CAD: 1.36,
      AUD: 1.52,
      JPY: 155.0,
      AED: 3.67,
      SAR: 3.75,
      PKR: 278.5,
      BDT: 117.2,
      SGD: 1.35
    },
    lastSyncTime: new Date().toISOString()
  },
  users: [
    {
      id: 1,
      name: 'System Admin',
      email: 'admin@booksaw.com',
      password: initialAdminPasswordHash,
      role: 'admin',
      country: 'US',
      currency: 'USD',
      createdAt: '2026-09-30T07:20:30.394Z'
    },
    {
      id: 2,
      name: 'John Reader',
      email: 'client@example.com',
      password: initialCustomerPasswordHash,
      role: 'customer',
      country: 'US',
      currency: 'USD',
      createdAt: '2026-09-30T07:20:30.401Z'
    },
    {
      id: 3,
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      password: initialCustomerPasswordHash,
      role: 'customer',
      country: 'IN',
      currency: 'INR',
      createdAt: '2026-09-30T07:23:22.798Z'
    }
  ],
  books: [],
  orders: [
    {
      id: 1,
      orderNumber: 'BS-00101',
      customerName: 'John Reader',
      customerEmail: 'client@example.com',
      customerPhone: '+1 555-0199',
      customerAddress: '742 Evergreen Terrace, Springfield, OR',
      customerCountry: 'US',
      items: [
        {
          id: 1,
          title: 'Simple Way of Peaceful Life',
          author: 'Armor Ramsey',
          priceUSD: 40,
          qty: 1,
          image: 'images/product-item1.jpg'
        }
      ],
      subtotalUSD: 40,
      discountUSD: 0,
      shippingUSD: 0,
      taxUSD: 2,
      totalUSD: 42,
      currency: 'USD',
      exchangeRate: 1.0,
      convertedTotal: 42,
      paymentMethod: 'card',
      paymentStatus: 'paid',
      status: 'delivered',
      createdAt: '2026-10-01T10:15:00.000Z'
    },
    {
      id: 2,
      orderNumber: 'BS-00102',
      customerName: 'Rahul Sharma',
      customerEmail: 'rahul@example.com',
      customerPhone: '+91 9876543210',
      customerAddress: '42 MG Road, Bangalore, KA',
      customerCountry: 'IN',
      items: [
        {
          id: 2,
          title: 'Great Travel at Desert',
          author: 'Sanchit Howdy',
          priceUSD: 26,
          qty: 1,
          image: 'images/product-item2.jpg'
        },
        {
          id: 4,
          title: 'Once Upon a Time',
          author: 'Klein Marry',
          priceUSD: 28,
          qty: 1,
          image: 'images/product-item4.jpg'
        }
      ],
      subtotalUSD: 54,
      discountUSD: 5.4,
      shippingUSD: 0,
      taxUSD: 2.7,
      totalUSD: 51.3,
      currency: 'INR',
      exchangeRate: 83.5,
      convertedTotal: 4283.55,
      paymentMethod: 'card',
      paymentStatus: 'paid',
      status: 'processing',
      createdAt: '2026-10-02T14:30:00.000Z'
    }
  ],
  coupons: [
    {
      id: 1,
      code: 'BOOKSAW15',
      discountPercent: 15,
      minOrderUSD: 30,
      expiryDate: '2027-12-31',
      active: true
    },
    {
      id: 2,
      code: 'WELCOME10',
      discountPercent: 10,
      minOrderUSD: 0,
      expiryDate: '2027-12-31',
      active: true
    },
    {
      id: 3,
      code: 'SUMMER25',
      discountPercent: 25,
      minOrderUSD: 50,
      expiryDate: '2027-08-31',
      active: true
    }
  ],
  pricingRules: [
    {
      id: 1,
      countryCode: 'IN',
      countryName: 'India',
      currency: 'INR',
      multiplier: 0.85,
      fixedDiscountPercent: 15,
      active: true,
      createdAt: '2026-10-01T12:00:00.000Z'
    },
    {
      id: 2,
      countryCode: 'GB',
      countryName: 'United Kingdom',
      currency: 'GBP',
      multiplier: 1.0,
      fixedDiscountPercent: 0,
      active: true,
      createdAt: '2026-10-01T12:00:00.000Z'
    },
    {
      id: 3,
      countryCode: 'AE',
      countryName: 'United Arab Emirates',
      currency: 'AED',
      multiplier: 1.1,
      fixedDiscountPercent: 0,
      active: true,
      createdAt: '2026-10-01T12:00:00.000Z'
    },
    {
      id: 4,
      countryCode: 'CA',
      countryName: 'Canada',
      currency: 'CAD',
      multiplier: 1.0,
      fixedDiscountPercent: 5,
      active: true,
      createdAt: '2026-10-01T12:00:00.000Z'
    }
  ],
  blogs: [
    {
      id: 1,
      title: '10 Essential Books for Mindful Living in 2026',
      author: 'Elena Rostova',
      category: 'Self-Help',
      image: 'images/post-img1.jpg',
      excerpt: 'Discover the most impactful mindfulness and productivity literature to enhance mental clarity and balance.',
      content: 'In our fast-paced modern world, cultivating intentional habits and mindfulness is no longer a luxury—it is an essential survival skill. We break down the top ten books that provide concrete mental models, morning rituals, and reflective writing exercises to quiet the noise and elevate your focus.',
      tags: ['Mindfulness', 'Productivity', 'Self-Help'],
      isPublished: true,
      views: 1420,
      createdAt: '2026-09-25T11:00:00.000Z',
      updatedAt: '2026-09-25T11:00:00.000Z'
    },
    {
      id: 2,
      title: 'The Digital Publishing Revolution: E-Books & Interactive Reading',
      author: 'Marcus Vance',
      category: 'Technology',
      image: 'images/post-img2.jpg',
      excerpt: 'How instantaneous PDF delivery, dynamic annotations, and embedded media are transforming traditional literature.',
      content: 'Digital publishing has evolved far beyond static text on screens. Today readers enjoy instant chapter previews, synchronous audio narration, and personalized typography settings. We explore where the industry is heading and why digital book sales continue to reach unprecedented heights.',
      tags: ['E-Books', 'Publishing', 'Tech'],
      isPublished: true,
      views: 980,
      createdAt: '2026-09-28T09:30:00.000Z',
      updatedAt: '2026-09-28T09:30:00.000Z'
    },
    {
      id: 3,
      title: 'Top Sci-Fi & Speculative Fiction Releases This Season',
      author: 'Clara Oswald',
      category: 'Fiction',
      image: 'images/post-img3.jpg',
      excerpt: 'From deep space exploratory odysseys to clockwork fantasy worlds, here are the must-reads of the year.',
      content: 'Immerse yourself in vivid world-building and visionary narratives. Our curated selection of this season’s finest speculative fiction will take your imagination on unforgettable journeys across uncharted galaxies and intricate steampunk empires.',
      tags: ['Sci-Fi', 'Fiction', 'Recommendations'],
      isPublished: true,
      views: 2150,
      createdAt: '2026-10-01T15:00:00.000Z',
      updatedAt: '2026-10-01T15:00:00.000Z'
    }
  ]
});

module.exports = {
  getInitialSeedData
};
