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
  books: [
    {
      id: 1,
      title: 'Simple Way of Peaceful Life',
      author: 'Armor Ramsey',
      priceUSD: 40,
      originalPriceUSD: 50,
      category: 'Self-Help',
      rating: 4.8,
      reviews: 128,
      image: 'images/product-item1.jpg',
      pdfFile: '/uploads/pdfs/sample-peaceful-life.pdf',
      samplePages: [
        {
          pageNumber: 1,
          chapterTitle: 'Chapter 1: The Still Mind',
          content: 'Peace is not the absence of trouble, but the presence of serenity in the midst of it. When we slow down our breath and align our priorities, everyday life becomes a source of boundless joy.'
        },
        {
          pageNumber: 2,
          chapterTitle: 'Chapter 2: The Art of Breathing',
          content: 'Every conscious breath dissolves lingering anxieties and reconnects the nervous system to the present moment.'
        },
        {
          pageNumber: 3,
          chapterTitle: 'Chapter 3: Mindful Morning Rituals',
          content: 'How you greet the sunrise determines how you process the obstacles of the afternoon.'
        }
      ],
      isFeatured: true,
      isBestSeller: true,
      isPopular: true,
      isSpecialOffer: false,
      isAudiobook: false,
      audioUrl: '',
      description: 'A transformative guide to living peacefully in a chaotic world. Discover mindfulness techniques and simple daily practices.',
      stock: 150,
      createdAt: '2026-09-30T07:20:30.401Z',
      updatedAt: '2026-09-30T07:20:30.401Z'
    },
    {
      id: 2,
      title: 'Great Travel at Desert',
      author: 'Sanchit Howdy',
      priceUSD: 26,
      originalPriceUSD: 35,
      category: 'Fiction',
      rating: 4.5,
      reviews: 89,
      image: 'images/product-item2.jpg',
      pdfFile: '/uploads/pdfs/sample-desert-travel.pdf',
      samplePages: [
        {
          pageNumber: 1,
          chapterTitle: 'Prologue: The Golden Horizon',
          content: 'The desert does not reveal its secrets willingly. You must listen to the wind across the dunes and learn the ancient navigation of the stars.'
        },
        {
          pageNumber: 2,
          chapterTitle: 'Chapter 1: Preparing the Caravan',
          content: 'Salt, water, dried dates, and compass readings. Crossing the sand sea requires respect for the sun.'
        }
      ],
      isFeatured: true,
      isBestSeller: false,
      isPopular: true,
      isSpecialOffer: true,
      isAudiobook: false,
      audioUrl: '',
      description: 'An epic journey through the golden sands of the Sahara desert. Experience the thrill of exploration and ancient wonders.',
      stock: 120,
      createdAt: '2026-09-30T07:20:30.401Z',
      updatedAt: '2026-09-30T07:20:30.401Z'
    },
    {
      id: 3,
      title: 'The Lady Beauty Scarlett',
      author: 'Arthur Doyle',
      priceUSD: 45,
      originalPriceUSD: 55,
      category: 'Fiction',
      rating: 4.7,
      reviews: 234,
      image: 'images/product-item3.jpg',
      pdfFile: '/uploads/pdfs/sample-scarlett.pdf',
      samplePages: [
        {
          pageNumber: 1,
          chapterTitle: 'Chapter 1: The Gaslit Ball',
          content: 'Beneath the gaslit lanterns of cobblestone streets, their eyes met across the crowded ballroom. It was a glance that would forever reshape two destinies.'
        }
      ],
      isFeatured: true,
      isBestSeller: true,
      isPopular: false,
      isSpecialOffer: false,
      isAudiobook: true,
      audioUrl: 'https://example.com/audio/scarlett-sample.mp3',
      description: 'A beautiful story set in Victorian England. A tale of passion, loss, and rediscovery under the London skies.',
      stock: 85,
      createdAt: '2026-09-30T07:20:30.401Z',
      updatedAt: '2026-09-30T07:20:30.401Z'
    },
    {
      id: 4,
      title: 'Once Upon a Time',
      author: 'Klein Marry',
      priceUSD: 28,
      originalPriceUSD: 38,
      category: 'Sci-Fi',
      rating: 4.3,
      reviews: 156,
      image: 'images/product-item4.jpg',
      pdfFile: '/uploads/pdfs/sample-once-upon.pdf',
      samplePages: [
        {
          pageNumber: 1,
          chapterTitle: 'Chapter 1: The Mirror in the Tower',
          content: 'Legends say that mirrors in the high tower don’t reflect who you are today, but who you are destined to become once your courage is tested.'
        }
      ],
      isFeatured: true,
      isBestSeller: false,
      isPopular: true,
      isSpecialOffer: true,
      isAudiobook: false,
      audioUrl: '',
      description: 'A magical tale that transports you to a world where ancient legends come alive with modern wit and wonder.',
      stock: 200,
      createdAt: '2026-09-30T07:20:30.401Z',
      updatedAt: '2026-09-30T07:20:30.401Z'
    },
    {
      id: 5,
      title: 'Portrait Photography & Design',
      author: 'Adam Silber',
      priceUSD: 40,
      originalPriceUSD: 48,
      category: 'Technology',
      rating: 4.6,
      reviews: 98,
      image: 'images/tab-item1.jpg',
      pdfFile: '/uploads/pdfs/sample-photography.pdf',
      samplePages: [
        {
          pageNumber: 1,
          chapterTitle: 'Module 1: The Essence of the Face',
          content: 'A photograph is not made with the camera; it is made with the eye, heart, and the ability to capture an authentic human emotion.'
        }
      ],
      isFeatured: false,
      isBestSeller: true,
      isPopular: true,
      isSpecialOffer: false,
      isAudiobook: false,
      audioUrl: '',
      description: 'Master the art of portrait photography with professional lighting techniques, aperture mastery, and real-world studio examples.',
      stock: 75,
      createdAt: '2026-09-30T07:20:30.401Z',
      updatedAt: '2026-09-30T07:20:30.401Z'
    },
    {
      id: 6,
      title: 'Business Strategy & Scaling',
      author: 'Evelyn Reed',
      priceUSD: 52,
      originalPriceUSD: 65,
      category: 'Business',
      rating: 4.9,
      reviews: 312,
      image: 'images/tab-item2.jpg',
      pdfFile: '/uploads/pdfs/sample-business.pdf',
      samplePages: [
        {
          pageNumber: 1,
          chapterTitle: 'Chapter 1: The Scalability Framework',
          content: 'Sustainable growth is built on repeatable systems, exceptional unit economics, and building high-trust autonomous teams.'
        }
      ],
      isFeatured: true,
      isBestSeller: true,
      isPopular: true,
      isSpecialOffer: false,
      isAudiobook: true,
      audioUrl: 'https://example.com/audio/business-sample.mp3',
      description: 'Comprehensive playbook for entrepreneurs and executives looking to scale their enterprise sustainably in the digital age.',
      stock: 180,
      createdAt: '2026-09-30T07:20:30.401Z',
      updatedAt: '2026-09-30T07:20:30.401Z'
    }
  ],
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
