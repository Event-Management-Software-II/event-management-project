const { Prisma } = require('@prisma/client');
const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');

const catCache = new NodeCache({ stdTTL: 300 });

const CACHE_KEYS = {
  public: 'categories:public',
  admin:  'categories:admin',
};

// ─── Cache ────────────────────────────────────────────────────────────────────

const invalidateCatCache = () => {
  catCache.del(CACHE_KEYS.public);
  catCache.del(CACHE_KEYS.admin);
};

// ─── Casos de uso ─────────────────────────────────────────────────────────────

const getPublicCategories = async (order) => {
  const cacheKey = `${CACHE_KEYS.public}:${order ?? 'default'}`;

  const cached = catCache.get(cacheKey);
  if (cached) return cached;

  const categories = await prisma.category.findMany({
    where:   { deleted_at: null },
    select:  { id_category: true, categoryName: true },
    orderBy: order === 'asc' ? { categoryName: 'asc' } : { id_category: 'asc' },
  });

  catCache.set(cacheKey, categories);
  return categories;
};

const getAdminCategories = async () => {
  const cached = catCache.get(CACHE_KEYS.admin);
  if (cached) return cached;

  const categories = await prisma.category.findMany({
    where:   { deleted_at: null },
    orderBy: { categoryName: 'asc' },
  });

  catCache.set(CACHE_KEYS.admin, categories);
  return categories;
};

const createCategory = async (categoryName) => {
  const category = await prisma.category.create({
    data: { categoryName: categoryName.trim() },
  });

  invalidateCatCache();
  return category;
};

const updateCategory = async (id, categoryName) => {
  const result = await prisma.category.updateMany({
    where: { id_category: id, deleted_at: null },
    data:  { categoryName: categoryName.trim(), updated_at: new Date() },
  });

  if (result.count === 0) throw new Error('CATEGORY_NOT_FOUND');

  const updated = await prisma.category.findUnique({
    where:  { id_category: id },
    select: { id_category: true, categoryName: true, updated_at: true },
  });

  invalidateCatCache();
  return updated;
};

const deleteCategory = async (id) => {
  const activeEventsCount = await prisma.event.count({
    where: { id_category: id, deleted_at: null },
  });

  if (activeEventsCount > 0)
    throw Object.assign(new Error('CATEGORY_HAS_ACTIVE_EVENTS'), { activeEventsCount });

  const result = await prisma.category.updateMany({
    where: { id_category: id, deleted_at: null },
    data:  { deleted_at: new Date() },
  });

  if (result.count === 0) throw new Error('CATEGORY_NOT_FOUND');

  invalidateCatCache();
};

const restoreCategory = async (id) => {
  const result = await prisma.category.updateMany({
    where: { id_category: id, deleted_at: { not: null } },
    data:  { deleted_at: null },
  });

  if (result.count === 0) throw new Error('CATEGORY_NOT_FOUND_OR_ACTIVE');

  invalidateCatCache();
};

module.exports = {
  getPublicCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
};