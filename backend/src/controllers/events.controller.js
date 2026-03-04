const pool = require('../db/pool');

// GET /api/events — active only with filters (RF-001.2)
const getEvents = async (req, res) => {
  try {
    const { name, category_id } = req.query;
    let query = `SELECT * FROM v_events WHERE 1=1`;
    const params = [];

    if (name) {
      params.push(`%${name}%`);
      query += ` AND "NameEvent" ILIKE $${params.length}`;
    }
    if (category_id) {
      params.push(category_id);
      query += ` AND "id_category" = $${params.length}`;
    }
    query += ` ORDER BY "id_event" DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// GET /api/events/:id — single visible event
const getEventById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM v_events WHERE "id_event" = $1`,
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};

// GET /api/events/admin/all — all events for admin (includes soft-deleted)
const getEventsAdmin = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        e.*,
        c."nameCategory",
        (
          SELECT "imageUrl" FROM "EventImage"
          WHERE "id_event" = e."id_event" AND "type" = 'poster'
          LIMIT 1
        ) AS "imageUrl"
      FROM "Event" e
      JOIN "Category" c ON e."Id_category" = c."id_category"
      ORDER BY e."id_event" DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// POST /api/events/admin — create event (RF-001.1)
const createEvent = async (req, res) => {
  const { NameEvent, Id_category, value, description, location, date_time, imageUrl } = req.body;

  if (!NameEvent || !/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/.test(NameEvent))
    return res.status(400).json({ error: 'Invalid name: only letters, numbers and spaces allowed' });
  if (!Id_category)
    return res.status(400).json({ error: 'Category is required' });
  if (value === undefined || Number.isNaN(Number(value)) || Number(value) < 0)
    return res.status(400).json({ error: 'Value must be a number >= 0' });
  if (!description || description.trim().length < 20)
    return res.status(400).json({ error: 'Description must be at least 20 characters' });
  if (!location || location.trim() === '')
    return res.status(400).json({ error: 'Location is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const evRes = await client.query(
      `INSERT INTO "Event" ("NameEvent", "Id_category", "value", "description", "location", "date_time")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [NameEvent.trim(), Id_category, Number(value), description.trim(), location.trim(), date_time || null]
    );
    const event = evRes.rows[0];
    if (imageUrl && imageUrl.trim() !== '') {
      await client.query(
        `INSERT INTO "EventImage" ("id_event", "imageUrl", "type") VALUES ($1, $2, 'poster')`,
        [event.id_event, imageUrl.trim()]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(event);
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Error in createEvent:', err);
    if (err.code === '23505') return res.status(409).json({ error: 'An event with that name already exists' });
    if (err.code === '23503') return res.status(400).json({ error: 'The specified category does not exist' });
    res.status(500).json({ error: 'Failed to create event' });
  } finally {
    client.release();
  }
};

// PUT /api/events/admin/:id — update event (RF-001.3)
const updateEvent = async (req, res) => {
  const { id } = req.params;
  const { NameEvent, Id_category, value, description, location, date_time, imageUrl } = req.body;

  if (NameEvent && !/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/.test(NameEvent))
    return res.status(400).json({ error: 'Invalid name' });
  if (value !== undefined && (Number.isNaN(Number(value)) || Number(value) < 0))
    return res.status(400).json({ error: 'Value must be >= 0' });
  if (description && description.trim().length < 20)
    return res.status(400).json({ error: 'Description must be at least 20 characters' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Trigger saves history automatically before UPDATE
    const result = await client.query(
      `UPDATE "Event"
       SET "NameEvent"   = COALESCE($1, "NameEvent"),
           "Id_category" = COALESCE($2, "Id_category"),
           "value"       = COALESCE($3, "value"),
           "description" = COALESCE($4, "description"),
           "location"    = COALESCE($5, "location"),
           "date_time"   = COALESCE($6, "date_time")
       WHERE "id_event" = $7 AND "deleted_at" IS NULL
       RETURNING *`,
      [
        NameEvent?.trim() || null,
        Id_category || null,
        value !== undefined ? Number(value) : null,
        description?.trim() || null,
        location?.trim() || null,
        date_time || null,
        id,
      ]
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found or already deleted' });
    }
    if (imageUrl !== undefined) {
      await client.query(`DELETE FROM "EventImage" WHERE "id_event" = $1 AND "type" = 'poster'`, [id]);
      if (imageUrl.trim() !== '')
        await client.query(
          `INSERT INTO "EventImage" ("id_event", "imageUrl", "type") VALUES ($1, $2, 'poster')`,
          [id, imageUrl.trim()]
        );
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'An event with that name already exists' });
    res.status(500).json({ error: 'Failed to update event' });
  } finally {
    client.release();
  }
};

// DELETE /api/events/admin/:id — soft delete (RF-001.4)
const deleteEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE "Event"
       SET "deleted_at" = NOW()
       WHERE "id_event" = $1 AND "deleted_at" IS NULL
       RETURNING *`,
      [id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Event not found or already deleted' });
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

// PATCH /api/events/admin/:id/restore — revert soft delete (RF-001.4)
const restoreEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE "Event"
       SET "deleted_at" = NULL
       WHERE "id_event" = $1 AND "deleted_at" IS NOT NULL
       RETURNING *`,
      [id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Event not found or already active' });
    res.json({ message: 'Event restored successfully' });
  } catch (err) {
    console.error('Error in restoreEvent:', err);
    res.status(500).json({ error: 'Failed to restore event' });
  }
};

// POST /api/events/:id/interest — register interest (RF-002.1)
const registerInterest = async (req, res) => {
  const { id } = req.params;
  const id_user = req.userId;
  try {
    const event = await pool.query(
      `SELECT "id_event" FROM v_events WHERE "id_event" = $1`,
      [id]
    );
    if (event.rowCount === 0) return res.status(404).json({ error: 'Event not found' });

    await pool.query(
      `INSERT INTO "Interest" ("id_event", "user_identifier") VALUES ($1, $2)`,
      [id, String(id_user)]
    );
    const count = await pool.query(`SELECT COUNT(*) FROM "Interest" WHERE "id_event" = $1`, [id]);
    res.status(201).json({ message: 'Interest registered!', total_interests: Number.parseInt(count.rows[0].count, 10) });
  } catch (err) {
    console.error('Error in registerInterest:', err);
    if (err.code === '23505') return res.status(409).json({ error: 'You already registered interest in this event' });
    res.status(500).json({ error: 'Failed to register interest' });
  }
};

// DELETE /api/events/:id/interest — remove interest
const removeInterest = async (req, res) => {
  const { id } = req.params;
  const id_user = req.userId;
  try {
    const result = await pool.query(
      `DELETE FROM "Interest" WHERE "id_event" = $1 AND "user_identifier" = $2`,
      [id, String(id_user)]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'No interest found to remove' });
    const count = await pool.query(`SELECT COUNT(*) FROM "Interest" WHERE "id_event" = $1`, [id]);
    res.json({ message: 'Interest removed', total_interests: Number.parseInt(count.rows[0].count, 10) });
  } catch (err) {
    console.error('Error in removeInterest:', err);
    res.status(500).json({ error: 'Failed to remove interest' });
  }
};

// GET /api/events/:id/interest/status
const getInterestStatus = async (req, res) => {
  const { id } = req.params;
  const id_user = req.userId;
  try {
    const [status, count] = await Promise.all([
      pool.query(`SELECT "id_interest" FROM "Interest" WHERE "id_event" = $1 AND "user_identifier" = $2`, [id, String(id_user)]),
      pool.query(`SELECT COUNT(*) FROM "Interest" WHERE "id_event" = $1`, [id]),
    ]);
    res.json({ interested: status.rowCount > 0, total_interests: Number.parseInt(count.rows[0].count, 10) });
  } catch (err) {
    console.error('Error in getInterestStatus:', err);
    res.status(500).json({ error: 'Failed to fetch interest status' });
  }
};

module.exports = {
  getEvents, getEventById, getEventsAdmin,
  createEvent, updateEvent, deleteEvent, restoreEvent,
  registerInterest, removeInterest, getInterestStatus,
};