const { Router } = require('express');
const {
  getCatalog,
  createCatalogItem,
  updateCatalogItem, // ← agregar import
  softDeleteCatalogItem,
  restoreCatalogItem,
} = require('../controllers/ticketCatalog.controller');
const { authenticateAdmin } = require('../middleware/auth.middleware');

const router = Router();

// Public
router.get('/', getCatalog);

// Admin only
router.post('/admin', authenticateAdmin, createCatalogItem);
router.put('/admin/:id', authenticateAdmin, updateCatalogItem); // ← nueva
router.delete('/admin/:id', authenticateAdmin, softDeleteCatalogItem);
router.patch('/admin/:id/restore', authenticateAdmin, restoreCatalogItem);

module.exports = router;
