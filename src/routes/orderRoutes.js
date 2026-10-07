const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, orderController.getOrders);
router.get('/:id', optionalAuth, orderController.getOrderById);
router.post('/', optionalAuth, orderController.createOrder);
router.patch('/:id/status', authenticate, requireAdmin, orderController.updateOrderStatus);

module.exports = router;
