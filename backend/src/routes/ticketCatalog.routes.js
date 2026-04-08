const { Router } = require('express');
const {
  getCatalog,
  createCatalogItem,
  softDeleteCatalogItem,
  restoreCatalogItem,
} = require('../controllers/ticketCatalog.controller');
const { authenticateAdmin } = require('../middleware/auth.middleware');

const router = Router();

// Public - Para que usuarios vean opciones disponibles al crear eventos
router.get('/', getCatalog);

// Admin only
router.post('/admin',               authenticateAdmin, createCatalogItem);
router.delete('/admin/:id',         authenticateAdmin, softDeleteCatalogItem);
router.patch('/admin/:id/restore',  authenticateAdmin, restoreCatalogItem);

module.exports = router;