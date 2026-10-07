const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { optionalAuth } = require('../middleware/auth');

// Checkout Order creation
router.post('/create-order', optionalAuth, paymentController.createOrder);

// Checkout payment verification
router.post('/verify', optionalAuth, paymentController.verifyPayment);

// Razorpay Webhooks (note: express.raw middleware is handled in app.js or route)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// Compatibility alias for storefront
router.post('/create-intent', optionalAuth, paymentController.createIntent);

module.exports = router;
