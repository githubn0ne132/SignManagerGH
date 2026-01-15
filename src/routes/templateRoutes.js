const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const adminAuth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public routes
router.get('/', templateController.getAllTemplates);
router.get('/active', templateController.getActiveTemplate);

// Admin routes
router.post('/', adminAuth, templateController.createTemplate);
router.put('/:id', adminAuth, upload.single('bgImage'), templateController.updateTemplate);
router.put('/:id/active', adminAuth, templateController.setActiveTemplate);
router.delete('/:id', adminAuth, templateController.deleteTemplate);

module.exports = router;
