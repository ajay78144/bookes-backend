const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config/config');
const apiRoutes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// ═══════════════════════════════════════════════════════════════
// 1. SECURITY & HELMET MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Razorpay checkout SDK, custom CDN fonts & stylesheets
    crossOriginEmbedderPolicy: false
  })
);

// ═══════════════════════════════════════════════════════════════
// 2. CORS CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const allowedOrigins = [
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
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, mobile apps, electron, file://)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.NODE_ENV !== 'production' ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Dev permissive
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
// 3. BODY PARSERS & STATIC ASSETS
// ═══════════════════════════════════════════════════════════════
// Special handling for Razorpay raw webhook payload
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payment/webhook') {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded covers & PDFs statically
app.use('/uploads', express.static(config.UPLOADS_DIR));

// Serve static admin files if placed in public directory
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Serve parent directory static files (storefront & admin assets, images, etc.)
const parentDir = path.resolve(__dirname, '../../');
app.use(express.static(parentDir));
app.use('/images', express.static(path.join(parentDir, 'images')));
app.use('/css', express.static(path.join(parentDir, 'css')));
app.use('/js', express.static(path.join(parentDir, 'js')));

// ═══════════════════════════════════════════════════════════════
// 4. REST API ROUTES
// ═══════════════════════════════════════════════════════════════
app.use('/api', apiRoutes);

// Root route welcome & health status
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'BookSaw Production REST API Server is running.',
    documentation: '/api',
    adminDashboard: '/dashboard.html',
    version: '2.0.0',
    gateway: 'Razorpay Enabled'
  });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// ═══════════════════════════════════════════════════════════════
// 5. ERROR HANDLING
// ═══════════════════════════════════════════════════════════════
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
