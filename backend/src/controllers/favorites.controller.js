const pool = require('../db/pool');
const NodeCache =require('node-cache');
const favCache = new NodeCache({ stdTTL: 60 });

// POST /api/favorites/:id_event — add to favorites
const addFavorite = async (req, res) => {
  const { id_event } = req.params;
  const id_user = req.userId;
  try {
    const event = await pool.query(
      `SELECT "id_event" FROM "Event" WHERE "id_event" = $1 AND "deleted_at" IS NULL`,
      [id_event]
    );
    if (event.rowCount === 0)
      return res.status(404).json({ error: 'Event not found' });

    await pool.query(
      `INSERT INTO "UserEvent" ("id_user", "id_event") VALUES ($1, $2)`,
      [id_user, id_event]
    );
    favCache.del(`favorites:${id_user}`);
    res.status(201).json({ message: 'Event added to favorites' });
  } catch (err) {
    if (err.code === '23505')
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
    const result = await pool.query(
      `DELETE FROM "UserEvent" WHERE "id_user" = $1 AND "id_event" = $2`,
      [id_user, id_event]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Favorite not found' });
    favCache.del(`favorites:${id_user}`);
    res.json({ message: 'Event removed from favorites' });
  } catch (err) {
    console.error('Error in removeFavorite:', err);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
};

// GET /api/favorites  ← este es el BE4-V1 del task
const getFavorites = async (req, res) => {
  const id_user = req.userId;
  const cacheKey = `favorites:${id_user}`;

  const cached = favCache.get(cacheKey);
  if (cached) {
    return res.status(200).json({ ok: true, data: cached });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
          id_event          AS "idEvent",
          "NameEvent"       AS "name",
          value,
          location,
          date_time         AS "dateTime",
          "nameCategory"    AS "category",
          "imageUrl",
          favorited_at      AS "favoritedAt"
       FROM v_user_favorites
       WHERE "id_user" = $1`,
      [id_user]
    );

    favCache.set(cacheKey, rows);
    return res.status(200).json({ ok: true, data: rows });
  } catch (err) {
    console.error('Error in getFavorites:', err);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
};

// GET /api/favorites/:id_event/status — check if event is favorited by user
const getFavoriteStatus = async (req, res) => {
  const { id_event } = req.params;
  const id_user = req.userId;
  try {
    const result = await pool.query(
      `SELECT "id_favorite" FROM "UserEvent" WHERE "id_user" = $1 AND "id_event" = $2`,
      [id_user, id_event]
    );
    res.json({ favorited: result.rowCount > 0 });
  } catch (err) {
    console.error('Error in getFavoriteStatus:', err);
    res.status(500).json({ error: 'Failed to fetch favorite status' });
  }
};

module.exports = { addFavorite, removeFavorite, getFavorites, getFavoriteStatus };