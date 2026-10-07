const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currencyController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/rates', currencyController.getRates);
router.post('/sync', authenticate, requireAdmin, currencyController.syncRates);

module.exports = router;
