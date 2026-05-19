const { Prisma } = require('@prisma/client');
const catalogService = require('../services/ticketCatalog.service');
const logger = require('../utils/logger');

const TYPE_NAME_REGEX = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/;

const getCatalog = async (req, res) => {
  try {
    const data = await catalogService.getCatalog();
    res.json({ ok: true, data });
  } catch (err) {
    logger.error('Failed to fetch ticket catalog', {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: 'Failed to fetch ticket catalog' });
  }
};

const getCatalogAdmin = async (req, res) => {
  try {
    const data = await catalogService.getCatalogAdmin();
    res.json({ ok: true, data });
  } catch (err) {
    logger.error('Failed to fetch admin catalog', {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: 'Failed to fetch catalog' });
  }
};

const createCatalogItem = async (req, res) => {
  const { typeName } = req.body;

  if (!typeName || typeName.trim() === '')
    return res.status(400).json({ error: 'Type name is required' });

  if (!TYPE_NAME_REGEX.test(typeName))
    return res
      .status(400)
      .json({
        error: 'Invalid type name: only letters, numbers and spaces allowed',
      });

  try {
    const data = await catalogService.createCatalogItem(typeName);
    logger.info('Ticket type created', { typeName, userId: req.userId });
    res.status(201).json({ ok: true, data });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    )
      return res
        .status(409)
        .json({ error: 'A ticket type with that name already exists' });
    logger.error('Failed to create ticket type', {
      typeName,
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: 'Failed to create ticket type' });
  }
};

const softDeleteCatalogItem = async (req, res) => {
  const { id } = req.params;

  try {
    await catalogService.softDeleteCatalogItem(id);
    logger.info('Ticket type deleted', { id, userId: req.userId });
    res.json({ message: 'Ticket type deleted successfully' });
  } catch (err) {
    if (err.code === 'IN_USE')
      return res.status(409).json({ error: err.message });
    if (err.code === 'NOT_FOUND')
      return res.status(404).json({ error: err.message });
    logger.error('Failed to delete ticket type', {
      id,
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: 'Failed to delete ticket type' });
  }
};

const restoreCatalogItem = async (req, res) => {
  const { id } = req.params;

  try {
    await catalogService.restoreCatalogItem(id);
    logger.info('Ticket type restored', { id, userId: req.userId });
    res.json({ message: 'Ticket type restored successfully' });
  } catch (err) {
    if (err.code === 'NOT_FOUND')
      return res.status(404).json({ error: err.message });
    logger.error('Failed to restore ticket type', {
      id,
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: 'Failed to restore ticket type' });
  }
};

const updateCatalogItem = async (req, res) => {
  const { id } = req.params;
  const { typeName } = req.body;

  if (!typeName?.trim())
    return res.status(400).json({ error: 'Type name is required' });

  if (!TYPE_NAME_REGEX.test(typeName))
    return res.status(400).json({ error: 'Invalid type name' });

  try {
    await catalogService.updateCatalogItem(id, typeName);
    logger.info('Ticket type updated', { id, typeName, userId: req.userId });
    res.json({ message: 'Ticket type updated successfully' });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    )
      return res
        .status(409)
        .json({ error: 'A ticket type with that name already exists' });
    if (err.code === 'NOT_FOUND')
      return res.status(404).json({ error: err.message });
    logger.error('Failed to update ticket type', {
      id,
      error: err.message,
      stack: err.stack,
    });
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
