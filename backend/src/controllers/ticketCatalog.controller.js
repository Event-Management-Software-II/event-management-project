const { Prisma } = require('@prisma/client');
const catalogService = require('../services/ticketCatalog.service');

const TYPE_NAME_REGEX = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/;

// GET /api/ticket-catalog — Listar tipos de tickets disponibles (VIP, General, etc.)
const getCatalog = async (req, res) => {
  try {
    const data = await catalogService.getCatalog();
    res.json({ ok: true, data });
  } catch (err) {
    console.error('Error in getCatalog:', err);
    res.status(500).json({ error: 'Failed to fetch ticket catalog' });
  }
};

// GET /api/ticket-catalog/admin — Listar todos incluyendo eliminados (Admin only)
const getCatalogAdmin = async (req, res) => {
  try {
    const data = await catalogService.getCatalogAdmin();
    res.json({ ok: true, data });
  } catch (err) {
    console.error('Error in getCatalogAdmin:', err);
    res.status(500).json({ error: 'Failed to fetch catalog' });
  }
};

// POST /api/ticket-catalog — Crear nuevo tipo de ticket (Admin only)
const createCatalogItem = async (req, res) => {
  const { typeName } = req.body;

  if (!typeName || typeName.trim() === '') {
    return res.status(400).json({ error: 'Type name is required' });
  }

  if (!TYPE_NAME_REGEX.test(typeName)) {
    return res.status(400).json({ error: 'Invalid type name: only letters, numbers and spaces allowed' });
  }

  try {
    const data = await catalogService.createCatalogItem(typeName);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ error: 'A ticket type with that name already exists' });
    }
    console.error('Error in createCatalogItem:', err);
    res.status(500).json({ error: 'Failed to create ticket type' });
  }
};

// DELETE /api/ticket-catalog/:id — Soft delete tipo de ticket (Admin only)
const softDeleteCatalogItem = async (req, res) => {
  const { id } = req.params;

  try {
    await catalogService.softDeleteCatalogItem(id);
    res.json({ message: 'Ticket type deleted successfully' });
  } catch (err) {
    if (err.code === 'IN_USE') return res.status(409).json({ error: err.message });
    if (err.code === 'NOT_FOUND') return res.status(404).json({ error: err.message });
    console.error('Error in softDeleteCatalogItem:', err);
    res.status(500).json({ error: 'Failed to delete ticket type' });
  }
};

// PUT /api/ticket-catalog/:id/restore — Restaurar tipo eliminado (Admin only)
const restoreCatalogItem = async (req, res) => {
  const { id } = req.params;

  try {
    await catalogService.restoreCatalogItem(id);
    res.json({ message: 'Ticket type restored successfully' });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ error: err.message });
    console.error('Error in restoreCatalogItem:', err);
    res.status(500).json({ error: 'Failed to restore ticket type' });
  }
};

// PATCH /api/ticket-catalog/:id — Actualizar nombre (Admin only)
const updateCatalogItem = async (req, res) => {
  const { id } = req.params;
  const { typeName } = req.body;

  if (!typeName?.trim()) {
    return res.status(400).json({ error: 'Type name is required' });
  }

  if (!TYPE_NAME_REGEX.test(typeName)) {
    return res.status(400).json({ error: 'Invalid type name' });
  }

  try {
    await catalogService.updateCatalogItem(id, typeName);
    res.json({ message: 'Ticket type updated successfully' });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ error: 'A ticket type with that name already exists' });
    }
    if (err.code === 'NOT_FOUND') return res.status(404).json({ error: err.message });
    console.error('Error in updateCatalogItem:', err);
    res.status(500).json({ error: 'Failed to update ticket type' });
  }
};

module.exports = {
  getCatalog,
  getCatalogAdmin,
  createCatalogItem,
  softDeleteCatalogItem,
  restoreCatalogItem,
  updateCatalogItem,
};