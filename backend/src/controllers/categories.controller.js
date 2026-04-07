const { Prisma } = require('@prisma/client');
const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');

const catCache = new NodeCache({ stdTTL: 300 });

const CACHE_KEYS = {
  public: 'categories:public',
  admin:  'categories:admin',
};

const invalidateCatCache = () => {
  catCache.del(CACHE_KEYS.public);
  catCache.del(CACHE_KEYS.admin);
};

const getCategories = async (req, res) => {
  const { order } = req.query;
  const cacheKey = `${CACHE_KEYS.public}:${order ?? 'default'}`;

  const cached = catCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const categories = await prisma.category.findMany({
      where: { deleted_at: null },
      select: {
        id_category:  true,
        categoryName: true,  // Cambiado de name a categoryName
      },
      orderBy: order === 'asc'
        ? { categoryName: 'asc' }  // Cambiado
        : { id_category: 'asc' },
    });

    catCache.set(cacheKey, categories);
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const getCategoriesAdmin = async (req, res) => {
  const cached = catCache.get(CACHE_KEYS.admin);
  if (cached) return res.json(cached);

  try {
    const categories = await prisma.category.findMany({
      where: { deleted_at: null },
      orderBy: { categoryName: 'asc' },  // Cambiado
    });

    catCache.set(CACHE_KEYS.admin, categories);
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const createCategory = async (req, res) => {
  const { categoryName } = req.body;  // Cambiado de name a categoryName

  if (!categoryName || categoryName.trim() === '')  // Cambiado
    return res.status(400).json({ error: 'Category name is required' });

  try {
    const category = await prisma.category.create({
      data: { categoryName: categoryName.trim() },  // Cambiado
    });

    invalidateCatCache();
    res.status(201).json(category);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return res.status(409).json({ error: 'A category with that name already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

const updateCategory = async (req, res) => {
  const id = Number(req.params.id);
  const { categoryName } = req.body;  // Cambiado

  if (!categoryName || categoryName.trim() === '')  // Cambiado
    return res.status(400).json({ error: 'Category name cannot be empty' });

  try {
    const result = await prisma.category.updateMany({
      where: { id_category: id, deleted_at: null },
      data: {
        categoryName: categoryName.trim(),  // Cambiado
        updated_at: new Date(),
      },
    });

    if (result.count === 0)
      return res.status(404).json({ error: 'Category not found' });

    const updated = await prisma.category.findUnique({
      where: { id_category: id },
      select: {
        id_category:  true,
        categoryName: true,  // Cambiado
        updated_at:   true,
      },
    });

    invalidateCatCache();
    res.json(updated);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return res.status(409).json({ error: 'A category with that name already exists' });
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

    invalidateCatCache();
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

    invalidateCatCache();
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