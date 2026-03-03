const pool = require('../db/pool');

// GET /api/categories (RF-003.2)
const getCategories = async (req, res) => {
  try {
    const { order } = req.query;
    const orderBy = order === 'asc' ? '"nameCategory" ASC' : '"id_category" ASC';
    const result = await pool.query(`SELECT * FROM v_categories ORDER BY ${orderBy}`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// GET /api/categories/admin
const getCategoriesAdmin = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM v_categories ORDER BY "nameCategory" ASC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// POST /api/categories/admin (RF-003.1)
const createCategory = async (req, res) => {
  const { nameCategory } = req.body;
  if (!nameCategory || nameCategory.trim() === '')
    return res.status(400).json({ error: 'Category name is required' });
  try {
    const result = await pool.query(
      `INSERT INTO "Category" ("nameCategory") VALUES ($1) RETURNING *`,
      [nameCategory.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A category with that name already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

// PUT /api/categories/admin/:id (RF-003.3)
const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { nameCategory } = req.body;
  if (!nameCategory || nameCategory.trim() === '')
    return res.status(400).json({ error: 'Category name cannot be empty' });
  try {
    const result = await pool.query(
      `UPDATE "Category"
       SET "nameCategory" = $1
       WHERE "id_category" = $2 AND "deleted_at" IS NULL
       RETURNING *`,
      [nameCategory.trim(), id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Category not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A category with that name already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

// DELETE /api/categories/admin/:id — soft delete (RF-003.4)
const deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const activeEvents = await pool.query(
      `SELECT COUNT(*) FROM v_events WHERE "id_category" = $1`,
      [id]
    );
    if (Number.parseInt(activeEvents.rows[0].count, 10) > 0)
      return res.status(409).json({
        error: 'This category has active events linked to it. Reassign them before deleting.',
        active_events: Number.parseInt(activeEvents.rows[0].count, 10),
      });

    const result = await pool.query(
      `UPDATE "Category"
       SET "deleted_at" = NOW()
       WHERE "id_category" = $1 AND "deleted_at" IS NULL
       RETURNING *`,
      [id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

// PATCH /api/categories/admin/:id/restore
const restoreCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE "Category"
       SET "deleted_at" = NULL
       WHERE "id_category" = $1 AND "deleted_at" IS NOT NULL
       RETURNING *`,
      [id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Category not found or already active' });
    res.json({ message: 'Category restored successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to restore category' });
  }
};

module.exports = { getCategories, getCategoriesAdmin, createCategory, updateCategory, deleteCategory, restoreCategory };