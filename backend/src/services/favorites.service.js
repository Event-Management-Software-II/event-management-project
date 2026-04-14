const { Prisma } = require('@prisma/client');
const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');

const favCache = new NodeCache({ stdTTL: 60 });

const CACHE_KEYS = {
  byUser: (id_user) => `favorites:${id_user}`,
};

const invalidateFavoriteCache = (id_user) => favCache.del(CACHE_KEYS.byUser(id_user));

// ── READ ──────────────────────────────────────────────────────────────────────

const getFavoritesByUser = async (id_user) => {
  const cacheKey = CACHE_KEYS.byUser(id_user);
  const cached = favCache.get(cacheKey);
  if (cached) return cached;

  const rows = await prisma.userEvent.findMany({
    where: {
      id_user: Number(id_user),
      event: { deleted_at: null },
      user:  { deleted_at: null },
    },
    include: {
      event: {
        include: {
          category:    true,
          images:      { where: { type: 'poster' }, take: 1 },
          ticketTypes: { where: { deleted_at: null }, select: { price: true }, orderBy: { price: 'asc' } },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  const data = rows.map((f) => {
    const prices   = f.event.ticketTypes.map((tt) => tt.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

    return {
      idEvent:      f.event.id_event,
      eventName:    f.event.eventName,
      priceRange:   minPrice === maxPrice
        ? (minPrice ? `$${minPrice}` : 'Free')
        : `$${minPrice} - $${maxPrice}`,
      minPrice,
      maxPrice,
      location:     f.event.location,
      dateTime:     f.event.date_time,
      categoryName: f.event.category.categoryName,
      imageUrl:     f.event.images[0]?.image_url ?? null,
      favoritedAt:  f.created_at,
    };
  });

  favCache.set(cacheKey, data);
  return data;
};

const getFavoriteStatus = async (id_user, id_event) => {
  const favorite = await prisma.userEvent.findUnique({
    where: {
      id_user_id_event: {
        id_user:  Number(id_user),
        id_event: Number(id_event),
      },
    },
  });
  return !!favorite;
};

// ── WRITE ─────────────────────────────────────────────────────────────────────

const addFavorite = async (id_user, id_event) => {
  const event = await prisma.event.findFirst({
    where: { id_event: Number(id_event), deleted_at: null },
  });
  if (!event) throw new Error('EVENT_NOT_FOUND');

  await prisma.userEvent.create({
    data: { id_user: Number(id_user), id_event: Number(id_event) },
  });

  invalidateFavoriteCache(id_user);
};

const removeFavorite = async (id_user, id_event) => {
  const result = await prisma.userEvent.deleteMany({
    where: { id_user: Number(id_user), id_event: Number(id_event) },
  });

  if (result.count === 0) throw new Error('FAVORITE_NOT_FOUND');

  invalidateFavoriteCache(id_user);
};

module.exports = {
  getFavoritesByUser,
  getFavoriteStatus,
  addFavorite,
  removeFavorite,
};