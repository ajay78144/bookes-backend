const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const paymentRoutes = require('./paymentRoutes');
const adminRoutes = require('./adminRoutes');
const bookRoutes = require('./bookRoutes');
const orderRoutes = require('./orderRoutes');
const userRoutes = require('./userRoutes');
const couponRoutes = require('./couponRoutes');
const currencyRoutes = require('./currencyRoutes');
const pricingRoutes = require('./pricingRoutes');
const blogRoutes = require('./blogRoutes');
const settingsRoutes = require('./settingsRoutes');
const uploadRoutes = require('./uploadRoutes');

// API Health / Info
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'BookSaw Production REST API Backend',
    version: '2.0.0',
    status: 'operational',
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

// Register Subroutes
router.use('/auth', authRoutes);
router.use('/payment', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/books', bookRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);
router.use('/coupons', couponRoutes);
router.use('/currency', currencyRoutes);
router.use('/pricing', pricingRoutes);
router.use('/blogs', blogRoutes);
router.use('/settings', settingsRoutes);
router.use('/upload', uploadRoutes);

module.exports = router;
