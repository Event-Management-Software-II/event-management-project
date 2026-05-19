const reportsService = require('../services/reports.service');
const logger = require('../utils/logger');

const getInterestReport = async (req, res) => {
  try {
    const data = await reportsService.getInterestReport();
    return res.json(data);
  } catch (err) {
    logger.error('Failed to generate interest report', {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: 'Failed to generate report' });
  }
};

const getSalesReport = async (req, res) => {
  try {
    const data = await reportsService.getSalesReport();
    return res.json({ ok: true, data });
  } catch (err) {
    logger.error('Failed to fetch sales report', {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: 'Failed to fetch sales report' });
  }
};

const getSalesReportByEvent = async (req, res) => {
  try {
    const data = await reportsService.getSalesReportByEvent();
    return res.json({ ok: true, data });
  } catch (err) {
    logger.error('Failed to fetch sales by event report', {
      error: err.message,
      stack: err.stack,
    });
    return res
      .status(500)
      .json({ error: 'Failed to fetch sales by event report' });
  }
};

const getFavoritesReport = async (req, res) => {
  try {
    const data = await reportsService.getFavoritesReport();
    return res.json({ ok: true, data });
  } catch (err) {
    logger.error('Failed to fetch favorites report', {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: 'Failed to fetch favorites report' });
  }
};

const getAdminHomeStats = async (req, res) => {
  try {
    const data = await reportsService.getAdminHomeStats();
    return res.json({ ok: true, data });
  } catch (err) {
    logger.error('Failed to fetch admin home stats', {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: 'Failed to fetch admin home stats' });
  }
};

module.exports = {
  getInterestReport,
  getSalesReport,
  getSalesReportByEvent,
  getFavoritesReport,
  getAdminHomeStats,
};
