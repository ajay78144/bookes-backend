const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All Admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// Dashboard overview stats & live status
router.get('/stats', adminController.getStats);

// Orders management with pagination, search, status filter
router.get('/orders', adminController.getOrders);

// Razorpay settings management
router.get('/settings/razorpay', adminController.getRazorpaySettings);
router.put('/settings/razorpay', adminController.updateRazorpaySettings);

// Test Razorpay connection
router.post('/settings/razorpay/test-connection', adminController.testConnection);

// Order refunds
router.post('/orders/:id/refund', adminController.processRefund);

// Resend digital license access
router.post('/orders/:id/resend-access', adminController.resendAccess);

// Users management
router.get('/users', adminController.getUsers);

module.exports = router;
