const { Prisma } = require('@prisma/client');
const categoriesService = require('../services/categories.service');

// ─── Handlers HTTP ────────────────────────────────────────────────────────────

const getCategories = async (req, res) => {
  try {
    const categories = await categoriesService.getPublicCategories(req.query.order);
    return res.json(categories);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const getCategoriesAdmin = async (req, res) => {
  try {
    const categories = await categoriesService.getAdminCategories();
    return res.json(categories);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const createCategory = async (req, res) => {
  const { categoryName } = req.body;

  if (!categoryName || categoryName.trim() === '')
    return res.status(400).json({ error: 'Category name is required' });

  try {
    const category = await categoriesService.createCategory(categoryName);
    return res.status(201).json(category);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return res.status(409).json({ error: 'A category with that name already exists' });
    console.error(err);
    return res.status(500).json({ error: 'Failed to create category' });
  }
};

const updateCategory = async (req, res) => {
  const { categoryName } = req.body;

  if (!categoryName || categoryName.trim() === '')
    return res.status(400).json({ error: 'Category name cannot be empty' });

  try {
    const updated = await categoriesService.updateCategory(Number(req.params.id), categoryName);
    return res.json(updated);
  } catch (err) {
    if (err.message === 'CATEGORY_NOT_FOUND')
      return res.status(404).json({ error: 'Category not found' });
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return res.status(409).json({ error: 'A category with that name already exists' });
    console.error(err);
    return res.status(500).json({ error: 'Failed to update category' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    await categoriesService.deleteCategory(Number(req.params.id));
    return res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    if (err.message === 'CATEGORY_NOT_FOUND')
      return res.status(404).json({ error: 'Category not found' });
    if (err.message === 'CATEGORY_HAS_ACTIVE_EVENTS')
      return res.status(409).json({
        error: 'This category has active events linked to it. Reassign them before deleting.',
        active_events: err.activeEventsCount,
      });
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete category' });
  }
};

const restoreCategory = async (req, res) => {
  try {
    await categoriesService.restoreCategory(Number(req.params.id));
    return res.json({ message: 'Category restored successfully' });
  } catch (err) {
    if (err.message === 'CATEGORY_NOT_FOUND_OR_ACTIVE')
      return res.status(404).json({ error: 'Category not found or already active' });
    console.error(err);
    return res.status(500).json({ error: 'Failed to restore category' });
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