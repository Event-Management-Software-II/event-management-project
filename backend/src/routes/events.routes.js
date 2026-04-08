const { Router } = require('express');
const {
  getEvents, getEventById, getEventsAdmin,
  createEvent, updateEvent, deleteEvent, restoreEvent,
  registerInterest, removeInterest, getInterestStatus,
} = require('../controllers/events.controller');
const {
  getEventTicketTypes,
  createEventTicketType,
  updateEventTicketType,
  softDeleteEventTicketType,
} = require('../controllers/eventTicketTypes.controller');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth.middleware');

const router = Router();

// Public
router.get('/',                              getEvents);

// Admin estáticos — DEBEN ir antes de /:id para que Express no los confunda con IDs
router.get('/admin/all',                     authenticateAdmin, getEventsAdmin);
router.post('/admin',                        authenticateAdmin, createEvent);
router.put('/admin/:id',                     authenticateAdmin, updateEvent);
router.delete('/admin/:id',                  authenticateAdmin, deleteEvent);
router.patch('/admin/:id/restore',           authenticateAdmin, restoreEvent);

// Rutas dinámicas por :id
router.get('/:id',                           getEventById);
router.get('/:id/interest/status',           authenticateToken, getInterestStatus);
router.post('/:id/interest',                 authenticateToken, registerInterest);
router.delete('/:id/interest',               authenticateToken, removeInterest);

// Ticket types por evento
router.get('/:id/ticket-types',              getEventTicketTypes);
router.post('/:id/ticket-types',             authenticateAdmin, createEventTicketType);
router.put('/:id/ticket-types/:id_ticket',   authenticateAdmin, updateEventTicketType);
router.delete('/:id/ticket-types/:id_ticket',authenticateAdmin, softDeleteEventTicketType);

module.exports = router;