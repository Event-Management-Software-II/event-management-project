const { Router } = require('express');
const rateLimit = require ( 'express-rate-limit' );
const { addFavorite, removeFavorite, getFavorites, getFavoriteStatus } = require('../controllers/favorites.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = Router();

const favoritesLimiter = rateLimit({
    windowMs: 60 * 1000, 
    max:30,
    message: { ok: false, message: 'Demasiadas solicitudes, intenta en un momento' }
});

// All favorites routes require authentication
router.get('/',                     authenticateToken, getFavorites);
router.get('/:id_event/status',     authenticateToken, getFavoriteStatus);
router.post('/:id_event',           authenticateToken, addFavorite);
router.delete('/:id_event',         authenticateToken, removeFavorite);

module.exports = router;
