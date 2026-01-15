const express = require('express');
const router = express.Router();
const fieldController = require('../controllers/fieldController');
const adminAuth = require('../middleware/authMiddleware');

// Public routes
router.get('/', fieldController.getFields);

// Admin routes
router.post('/', adminAuth, fieldController.saveField);
router.delete('/:id', adminAuth, fieldController.deleteField);

module.exports = router;
