const { Prisma } = require('@prisma/client');
const prisma = require('../prisma/prisma');

const getCategories = async (req, res) => {
  try {
    const { order } = req.query;

    const categories = await prisma.category.findMany({
      where: { deleted_at: null },
      orderBy: order === 'asc'
        ? { name: 'asc' }
        : { id_category: 'asc' },
    });

    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const getCategoriesAdmin = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { deleted_at: null },
      orderBy: { name: 'asc' },
    });

    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const createCategory = async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === '')
    return res.status(400).json({ error: 'Category name is required' });

  try {
    const category = await prisma.category.create({
      data: { name: name.trim() },
    });

    res.status(201).json(category);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return res.status(409).json({ error: 'A category with that name already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

const updateCategory = async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;

  if (!name || name.trim() === '')
    return res.status(400).json({ error: 'Category name cannot be empty' });

  try {
    const category = await prisma.category.updateMany({
      where: { id_category: id, deleted_at: null },
      data: {
        name: name.trim(),
        updated_at: new Date(),
      },
    });

    if (category.count === 0)
      return res.status(404).json({ error: 'Category not found' });

    const updated = await prisma.category.findUnique({
      where: { id_category: id },
    });

    res.json(updated);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return res.status(409).json({ error: 'A category with that name already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

const deleteCategory = async (req, res) => {
  const id = Number(req.params.id);

  try {
    const activeEventsCount = await prisma.event.count({
      where: { id_category: id, deleted_at: null },
    });

    if (activeEventsCount > 0) {
      return res.status(409).json({
        error: 'This category has active events linked to it. Reassign them before deleting.',
        active_events: activeEventsCount,
      });
    }

    const result = await prisma.category.updateMany({
      where: { id_category: id, deleted_at: null },
      data: { deleted_at: new Date() },
    });

    if (result.count === 0)
      return res.status(404).json({ error: 'Category not found' });

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

const restoreCategory = async (req, res) => {
  const id = Number(req.params.id);

  try {
    const result = await prisma.category.updateMany({
      where: { id_category: id, deleted_at: { not: null } },
      data: { deleted_at: null },
    });

    if (result.count === 0)
      return res.status(404).json({ error: 'Category not found or already active' });

    res.json({ message: 'Category restored successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to restore category' });
  }
};

module.exports = {
  getCategories,
  getCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
};