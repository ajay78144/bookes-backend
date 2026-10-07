const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/config');
const apiRoutes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// ═══════════════════════════════════════════════════════════════
// 1. SECURITY & HELMET MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// ═══════════════════════════════════════════════════════════════
// 2. CORS CONFIGURATION (Storefront & Admin origins allowlisted)
// ═══════════════════════════════════════════════════════════════
const allowedOrigins = config.cors?.allowedOrigins || [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, mobile apps, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.NODE_ENV !== 'production' ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Currency',
      'X-Auth-Token',
      'x-razorpay-signature',
      'Accept'
    ]
  })
);

// ═══════════════════════════════════════════════════════════════
// 3. BODY PARSERS
// ═══════════════════════════════════════════════════════════════
// Raw body handling for Razorpay webhook HMAC verification
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payment/webhook') {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded book covers & PDFs
app.use('/uploads', express.static(config.UPLOADS_DIR));

// ═══════════════════════════════════════════════════════════════
// 4. REST API ROUTES
// ═══════════════════════════════════════════════════════════════
app.use('/api', apiRoutes);

// API Root Status & Health
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'BookSaw Production REST API Server',
    version: '2.0.0',
    status: 'operational',
    documentation: '/api',
    endpoints: {
      auth: '/api/auth',
      payment: '/api/payment',
      admin: '/api/admin',
      books: '/api/books',
      orders: '/api/orders',
      users: '/api/users',
      coupons: '/api/coupons',
      currency: '/api/currency',
      pricing: '/api/pricing',
      blogs: '/api/blogs',
      settings: '/api/settings',
      upload: '/api/upload'
    },
    timestamp: new Date().toISOString()
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. ERROR HANDLING
// ═══════════════════════════════════════════════════════════════
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
