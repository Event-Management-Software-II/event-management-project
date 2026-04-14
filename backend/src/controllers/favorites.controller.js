const { Prisma } = require('@prisma/client');
const favoritesService = require('./favorites.service');

// POST /api/favorites/:id_event
const addFavorite = async (req, res) => {
  try {
    await favoritesService.addFavorite(req.userId, req.params.id_event);
    return res.status(201).json({ message: 'Event added to favorites' });
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND')
      return res.status(404).json({ error: 'Event not found' });
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return res.status(409).json({ error: 'Event already in favorites' });
    console.error('Error in addFavorite:', err);
    return res.status(500).json({ error: 'Failed to add favorite' });
  }
};

// DELETE /api/favorites/:id_event
const removeFavorite = async (req, res) => {
  try {
    await favoritesService.removeFavorite(req.userId, req.params.id_event);
    return res.json({ message: 'Event removed from favorites' });
  } catch (err) {
    if (err.message === 'FAVORITE_NOT_FOUND')
      return res.status(404).json({ error: 'Favorite not found' });
    console.error('Error in removeFavorite:', err);
    return res.status(500).json({ error: 'Failed to remove favorite' });
  }
};

// GET /api/favorites
const getFavorites = async (req, res) => {
  try {
    const data = await favoritesService.getFavoritesByUser(req.userId);
    return res.json({ ok: true, data });
  } catch (err) {
    console.error('Error in getFavorites:', err);
    return res.status(500).json({ error: 'Failed to fetch favorites' });
  }
};

// GET /api/favorites/:id_event/status
const getFavoriteStatus = async (req, res) => {
  try {
    const favorited = await favoritesService.getFavoriteStatus(req.userId, req.params.id_event);
    return res.json({ favorited });
  } catch (err) {
    console.error('Error in getFavoriteStatus:', err);
    return res.status(500).json({ error: 'Failed to fetch favorite status' });
  }
};

module.exports = { addFavorite, removeFavorite, getFavorites, getFavoriteStatus };