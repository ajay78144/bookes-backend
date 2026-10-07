const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', settingsController.getSettings);
router.put('/', authenticate, requireAdmin, settingsController.updateSettings);

module.exports = router;
