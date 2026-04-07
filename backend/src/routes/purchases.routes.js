const express = require('express');
const router = express.Router();
const { getPurchases } = require('../controllers/purchases.controller');
const {  authenticateToken } = require('../middleware/auth.middleware');

router.get('/', authenticateToken, getPurchases);
module.exports = router;