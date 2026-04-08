const { Router } = require('express');
const { getInterestReport, getSalesReport } = require('../controllers/reports.controller');
const { authenticateAdmin } = require('../middleware/auth.middleware');

const router = Router();

router.get('/interests', authenticateAdmin, getInterestReport);
router.get('/sales', authenticateAdmin, getSalesReport);

module.exports = router;