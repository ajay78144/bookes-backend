const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/rules', pricingController.getPricingRules);
router.post('/rules', authenticate, requireAdmin, pricingController.savePricingRule);
router.delete('/rules/:id', authenticate, requireAdmin, pricingController.deletePricingRule);

module.exports = router;
