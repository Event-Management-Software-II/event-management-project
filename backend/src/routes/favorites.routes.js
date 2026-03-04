const { Router } = require('express');
const { addFavorite, removeFavorite, getFavorites, getFavoriteStatus } = require('../controllers/favorites.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = Router();

// All favorites routes require authentication
router.get('/',                     authenticateToken, getFavorites);
router.get('/:id_event/status',     authenticateToken, getFavoriteStatus);
router.post('/:id_event',           authenticateToken, addFavorite);
router.delete('/:id_event',         authenticateToken, removeFavorite);

module.exports = router;