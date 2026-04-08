const { Prisma } = require('@prisma/client');
const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');
const favCache = new NodeCache({ stdTTL: 60 });

// POST /api/favorites/:id_event — add to favorites
const addFavorite = async (req, res) => {
  const { id_event } = req.params;
  const id_user = req.userId;
  try {
    const event = await prisma.event.findFirst({
      where: { id_event: Number(id_event), deleted_at: null },
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    await prisma.userEvent.create({
      data: { id_user: Number(id_user), id_event: Number(id_event) },
    });

    favCache.del(`favorites:${id_user}`);
    res.status(201).json({ message: 'Event added to favorites' });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return res.status(409).json({ error: 'Event already in favorites' });
    console.error('Error in addFavorite:', err);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
};

// DELETE /api/favorites/:id_event — remove from favorites
const removeFavorite = async (req, res) => {
  const { id_event } = req.params;
  const id_user = req.userId;
  try {
    const result = await prisma.userEvent.deleteMany({
      where: { id_user: Number(id_user), id_event: Number(id_event) },
    });

    if (result.count === 0)
      return res.status(404).json({ error: 'Favorite not found' });

    favCache.del(`favorites:${id_user}`);
    res.json({ message: 'Event removed from favorites' });
  } catch (err) {
    console.error('Error in removeFavorite:', err);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
};

// GET /api/favorites
const getFavorites = async (req, res) => {
  const id_user = req.userId;
  const cacheKey = `favorites:${id_user}`;

  const cached = favCache.get(cacheKey);
  if (cached) return res.status(200).json({ ok: true, data: cached });

  try {
    const favorites = await prisma.userEvent.findMany({
      where: {
        id_user: Number(id_user),
        event: { deleted_at: null },
        user: { deleted_at: null },
      },
      include: {
        event: {
          include: {
            category: true,
            images: { where: { type: 'poster' }, take: 1 },
            // NUEVO: Incluir tipos de tickets para mostrar rango de precios
            ticketTypes: {
              where: { deleted_at: null },
              select: { price: true },
              orderBy: { price: 'asc' }
            }
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const data = favorites.map(f => {
      const prices = f.event.ticketTypes.map(tt => tt.price);
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
      
      return {
        idEvent:      f.event.id_event,
        eventName:    f.event.eventName,
        // NUEVO: Rango de precios en lugar de precio único
        priceRange:   minPrice === maxPrice 
          ? (minPrice ? `$${minPrice}` : 'Free')
          : `$${minPrice} - $${maxPrice}`,
        minPrice:     minPrice,
        maxPrice:     maxPrice,
        location:     f.event.location,
        dateTime:     f.event.date_time,
        categoryName: f.event.category.categoryName,
        imageUrl:     f.event.images[0]?.image_url ?? null,
        favoritedAt:  f.created_at,
      };
    });

    favCache.set(cacheKey, data);
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('Error in getFavorites:', err);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
};

// GET /api/favorites/:id_event/status
const getFavoriteStatus = async (req, res) => {
  const { id_event } = req.params;
  const id_user = req.userId;
  try {
    const favorite = await prisma.userEvent.findUnique({
      where: {
        id_user_id_event: {
          id_user: Number(id_user),
          id_event: Number(id_event),
        },
      },
    });

    res.json({ favorited: !!favorite });
  } catch (err) {
    console.error('Error in getFavoriteStatus:', err);
    res.status(500).json({ error: 'Failed to fetch favorite status' });
  }
};

module.exports = { addFavorite, removeFavorite, getFavorites, getFavoriteStatus };