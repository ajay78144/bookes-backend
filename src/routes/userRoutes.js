const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, requireAdmin, userController.getUsers);
router.post('/', authenticate, requireAdmin, userController.createUser);
router.delete('/:id', authenticate, requireAdmin, userController.deleteUser);

module.exports = router;
