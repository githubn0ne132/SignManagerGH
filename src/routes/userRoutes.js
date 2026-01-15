const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/:id', userController.getUserData);
router.post('/:id', userController.saveUserData);

module.exports = router;
