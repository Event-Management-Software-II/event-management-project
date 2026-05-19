const { Prisma } = require('@prisma/client');
const favoritesService = require('../services/favorites.service');
const logger = require('../utils/logger');

const addFavorite = async (req, res) => {
  try {
    await favoritesService.addFavorite(req.userId, req.params.id_event);
    return res.status(201).json({ message: 'Event added to favorites' });
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND')
      return res.status(404).json({ error: 'Event not found' });
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    )
      return res.status(409).json({ error: 'Event already in favorites' });
    logger.error('Failed to add favorite', {
      userId: req.userId,
      eventId: req.params.id_event,
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: 'Failed to add favorite' });
  }
};

const removeFavorite = async (req, res) => {
  try {
    await favoritesService.removeFavorite(req.userId, req.params.id_event);
    return res.json({ message: 'Event removed from favorites' });
  } catch (err) {
    if (err.message === 'FAVORITE_NOT_FOUND')
      return res.status(404).json({ error: 'Favorite not found' });
    logger.error('Failed to remove favorite', {
      userId: req.userId,
      eventId: req.params.id_event,
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: 'Failed to remove favorite' });
  }
};

const getFavorites = async (req, res) => {
  try {
    const data = await favoritesService.getFavoritesByUser(req.userId);
    return res.json({ ok: true, data });
  } catch (err) {
    logger.error('Failed to fetch favorites', {
      userId: req.userId,
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: 'Failed to fetch favorites' });
  }
};

const getFavoriteStatus = async (req, res) => {
  try {
    const favorited = await favoritesService.getFavoriteStatus(
      req.userId,
      req.params.id_event
    );
    return res.json({ favorited });
  } catch (err) {
    logger.error('Failed to fetch favorite status', {
      userId: req.userId,
      eventId: req.params.id_event,
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: 'Failed to fetch favorite status' });
  }
};

module.exports = {
  addFavorite,
  removeFavorite,
  getFavorites,
  getFavoriteStatus,
};
