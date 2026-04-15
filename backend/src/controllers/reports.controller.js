const reportsService = require('../services/reports.service');

// GET /api/reports/interest
const getInterestReport = async (req, res) => {
  try {
    const data = await reportsService.getInterestReport();
    return res.json(data);
  } catch (err) {
    console.error('Error in getInterestReport:', err);
    return res.status(500).json({ error: 'Failed to generate report' });
  }
};

// GET /api/reports/sales
const getSalesReport = async (req, res) => {
  try {
    const data = await reportsService.getSalesReport();
    return res.json({ ok: true, data });
  } catch (err) {
    console.error('Error in getSalesReport:', err);
    return res.status(500).json({ error: 'Failed to fetch sales report' });
  }
};

// GET /api/reports/stats
const getAdminHomeStats = async (req, res) => {
  try {
    const data = await reportsService.getAdminHomeStats();
    return res.json({ ok: true, data });
  } catch (err) {
    console.error('Error in getAdminHomeStats:', err);
    return res.status(500).json({ error: 'Failed to fetch admin home stats' });
  }
};

module.exports = { getInterestReport, getSalesReport, getAdminHomeStats };