const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, requireAdmin, couponController.getCoupons);
router.post('/', authenticate, requireAdmin, couponController.createCoupon);
router.post('/verify', couponController.verifyCoupon); // Public checkout verification
router.delete('/:id', authenticate, requireAdmin, couponController.deleteCoupon);

module.exports = router;
