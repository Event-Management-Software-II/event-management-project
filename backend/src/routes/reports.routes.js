const { Router } = require('express');
const { getInterestReport } = require('../controllers/reports.controller');
const { authenticateAdmin } = require('../middleware/auth.middleware');

const router = Router();

router.get('/interests', authenticateAdmin, getInterestReport);

module.exports = router;