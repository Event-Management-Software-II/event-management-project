const { Router } = require('express');
const {
  getEvents, getEventById, getEventsAdmin,
  createEvent, updateEvent, deleteEvent, restoreEvent,
  registerInterest, removeInterest, getInterestStatus,
} = require('../controllers/events.controller');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth.middleware');

const router = Router();

// Public
router.get('/',                         getEvents);
router.get('/admin/all',                authenticateAdmin, getEventsAdmin);  // before /:id to avoid conflict
router.get('/:id',                      getEventById);
router.get('/:id/interest/status',      authenticateToken, getInterestStatus);
router.post('/:id/interest',            authenticateToken, registerInterest);
router.delete('/:id/interest',          authenticateToken, removeInterest);

// Admin
router.post('/admin',                   authenticateAdmin, createEvent);
router.put('/admin/:id',                authenticateAdmin, updateEvent);
router.delete('/admin/:id',             authenticateAdmin, deleteEvent);
router.patch('/admin/:id/restore',      authenticateAdmin, restoreEvent);

module.exports = router;