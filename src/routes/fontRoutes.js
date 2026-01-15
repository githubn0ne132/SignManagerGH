const express = require('express');
const router = express.Router();
const fontController = require('../controllers/fontController');
const adminAuth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', fontController.getFonts);
router.post('/', adminAuth, upload.single('fontFile'), fontController.uploadFont);

module.exports = router;
