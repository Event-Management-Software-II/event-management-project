const { Router } = require('express');
const { register, login, logout, getCurrentUser } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;