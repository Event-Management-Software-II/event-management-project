const { Router } = require('express');
const {
  getCategories, getCategoriesAdmin,
  createCategory, updateCategory,
  deleteCategory, restoreCategory,
} = require('../controllers/categories.controller');
const { authenticateAdmin } = require('../middleware/auth.middleware');

const router = Router();

// Public
router.get('/', getCategories);

// Admin
router.get('/admin',                authenticateAdmin, getCategoriesAdmin);
router.post('/admin',               authenticateAdmin, createCategory);
router.put('/admin/:id',            authenticateAdmin, updateCategory);
router.delete('/admin/:id',         authenticateAdmin, deleteCategory);
router.patch('/admin/:id/restore',  authenticateAdmin, restoreCategory);

module.exports = router;