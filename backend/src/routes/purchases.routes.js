const express = require('express');
const router = express.Router();
const {
  getPurchases,
  createPurchase,
} = require('../controllers/purchases.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/', authenticateToken, getPurchases);
router.post('/', authenticateToken, createPurchase);

module.exports = router;
