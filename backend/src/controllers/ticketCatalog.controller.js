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

// GET /api/ticket-catalog — Listar tipos de tickets disponibles (VIP, General, etc.)
const getCatalog = async (req, res) => {
  const cached = catalogCache.get(CACHE_KEYS.catalog);
  if (cached) return res.json({ ok: true, data: cached });

  try {
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
    res.json({ ok: true, data: catalog });
  } catch (err) {
    console.error('Error in getCatalog:', err);
    res.status(500).json({ error: 'Failed to fetch ticket catalog' });
  }
};

// POST /api/ticket-catalog — Crear nuevo tipo de ticket (Admin only)
const createCatalogItem = async (req, res) => {
  const { typeName } = req.body;

  if (!typeName || typeName.trim() === '') {
    return res.status(400).json({ error: 'Type name is required' });
  }

  if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/.test(typeName)) {
    return res.status(400).json({ error: 'Invalid type name: only letters, numbers and spaces allowed' });
  }

  try {
    const item = await prisma.ticketTypeCatalog.create({
      data: {
        typeName: typeName.trim(),
      },
    });

    invalidateCatalogCache();
    res.status(201).json({ ok: true, data: item });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ error: 'A ticket type with that name already exists' });
    }
    console.error('Error in createCatalogItem:', err);
    res.status(500).json({ error: 'Failed to create ticket type' });
  }
};

// DELETE /api/ticket-catalog/:id — Soft delete tipo de ticket (Admin only)
// Solo permite eliminar si no está siendo usado en eventos activos
const softDeleteCatalogItem = async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si está en uso en eventos activos
    const inUse = await prisma.eventTicketType.findFirst({
      where: {
        id_catalog: Number(id),
        deleted_at: null,
        event: { deleted_at: null },
      },
    });

    if (inUse) {
      return res.status(409).json({ 
        error: 'Cannot delete: This ticket type is currently assigned to active events' 
      });
    }

    const result = await prisma.ticketTypeCatalog.updateMany({
      where: { 
        id_catalog: Number(id), 
        deleted_at: null 
      },
      data: { deleted_at: new Date() },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Ticket type not found or already deleted' });
    }

    invalidateCatalogCache();
    res.json({ message: 'Ticket type deleted successfully' });
  } catch (err) {
    console.error('Error in softDeleteCatalogItem:', err);
    res.status(500).json({ error: 'Failed to delete ticket type' });
  }
};

// PUT /api/ticket-catalog/:id — Restaurar tipo eliminado (Admin only)
const restoreCatalogItem = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await prisma.ticketTypeCatalog.updateMany({
      where: { 
        id_catalog: Number(id), 
        deleted_at: { not: null } 
      },
      data: { deleted_at: null },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Ticket type not found or already active' });
    }

    invalidateCatalogCache();
    res.json({ message: 'Ticket type restored successfully' });
  } catch (err) {
    console.error('Error in restoreCatalogItem:', err);
    res.status(500).json({ error: 'Failed to restore ticket type' });
  }
};

const updateCatalogItem = async (req, res) => {
  const { id } = req.params;
  const { typeName } = req.body;

  if (!typeName?.trim()) return res.status(400).json({ error: 'Type name is required' });
  if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/.test(typeName))
    return res.status(400).json({ error: 'Invalid type name' });

  try {
    const result = await prisma.ticketTypeCatalog.updateMany({
      where: { id_catalog: Number(id), deleted_at: null },
      data: { typeName: typeName.trim() },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Ticket type not found' });
    invalidateCatalogCache();
    res.json({ message: 'Ticket type updated successfully' });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return res.status(409).json({ error: 'A ticket type with that name already exists' });
    res.status(500).json({ error: 'Failed to update ticket type' });
  }
};

const getCatalogAdmin = async (req, res) => {
  try {
    const catalog = await prisma.ticketTypeCatalog.findMany({
      orderBy: { typeName: 'asc' },
      select: {
        id_catalog: true,
        typeName: true,
        created_at: true,
        deleted_at: true,
      },
    });
    res.json({ ok: true, data: catalog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch catalog' });
  }
};

module.exports = {
  getCatalog,
  createCatalogItem,
  softDeleteCatalogItem,
  restoreCatalogItem,
  updateCatalogItem,
  getCatalogAdmin,
};
