const { Prisma } = require('@prisma/client');
const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');

const catalogCache = new NodeCache({ stdTTL: 300 });

const CACHE_KEYS = {
  catalog: 'ticket-catalog',
};

const invalidateCatalogCache = () => {
  catalogCache.del(CACHE_KEYS.catalog);
};

const getCatalog = async () => {
  const cached = catalogCache.get(CACHE_KEYS.catalog);
  if (cached) return cached;

  const catalog = await prisma.ticketTypeCatalog.findMany({
    where: { deleted_at: null },
    orderBy: { typeName: 'asc' },
    select: {
      id_catalog: true,
      typeName: true,
      created_at: true,
    },
  });

  catalogCache.set(CACHE_KEYS.catalog, catalog);
  return catalog;
};

const getCatalogAdmin = async () => {
  return prisma.ticketTypeCatalog.findMany({
    orderBy: { typeName: 'asc' },
    select: {
      id_catalog: true,
      typeName: true,
      created_at: true,
      deleted_at: true,
    },
  });
};

const createCatalogItem = async (typeName) => {
  return prisma.ticketTypeCatalog.create({
    data: { typeName: typeName.trim() },
  });
};

const softDeleteCatalogItem = async (id) => {
  const inUse = await prisma.eventTicketType.findFirst({
    where: {
      id_catalog: Number(id),
      deleted_at: null,
      event: { deleted_at: null },
    },
  });

  if (inUse) {
    const err = new Error('Cannot delete: This ticket type is currently assigned to active events');
    err.code = 'IN_USE';
    throw err;
  }

  const result = await prisma.ticketTypeCatalog.updateMany({
    where: { id_catalog: Number(id), deleted_at: null },
    data: { deleted_at: new Date() },
  });

  if (result.count === 0) {
    const err = new Error('Ticket type not found or already deleted');
    err.code = 'NOT_FOUND';
    throw err;
  }

  invalidateCatalogCache();
};

const restoreCatalogItem = async (id) => {
  const result = await prisma.ticketTypeCatalog.updateMany({
    where: { id_catalog: Number(id), deleted_at: { not: null } },
    data: { deleted_at: null },
  });

  if (result.count === 0) {
    const err = new Error('Ticket type not found or already active');
    err.code = 'NOT_FOUND';
    throw err;
  }

  invalidateCatalogCache();
};

const updateCatalogItem = async (id, typeName) => {
  const result = await prisma.ticketTypeCatalog.updateMany({
    where: { id_catalog: Number(id), deleted_at: null },
    data: { typeName: typeName.trim() },
  });

  if (result.count === 0) {
    const err = new Error('Ticket type not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  invalidateCatalogCache();
};

module.exports = {
  getCatalog,
  getCatalogAdmin,
  createCatalogItem,
  softDeleteCatalogItem,
  restoreCatalogItem,
  updateCatalogItem,
};