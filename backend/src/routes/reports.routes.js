const { Router } = require('express');
const {
  getInterestReport,
  getSalesReport,
  getAdminHomeStats,
} = require('../controllers/reports.controller');
const { authenticateAdmin } = require('../middleware/auth.middleware');

const router = Router();

router.get('/interests', authenticateAdmin, getInterestReport);
router.get('/sales', authenticateAdmin, getSalesReport);
router.get('/home-stats', authenticateAdmin, getAdminHomeStats);

module.exports = router;
