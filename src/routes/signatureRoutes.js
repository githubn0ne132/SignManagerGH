const express = require('express');
const router = express.Router();
const signatureController = require('../controllers/signatureController');

router.get('/:userId/html', signatureController.getHtmlSnippet);
router.get('/:userId/image.png', signatureController.getSignatureImage);

module.exports = router;
