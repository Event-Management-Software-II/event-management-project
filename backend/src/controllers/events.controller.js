const { Prisma } = require('@prisma/client');
const eventsService = require('./events.service');

const validateCreateInput = ({ eventName, id_category, description, date_time, ticketTypes }) => {
  if (!eventName || !/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/.test(eventName))
    return 'Invalid name: only letters, numbers and spaces allowed';
  if (!id_category)
    return 'Category is required';
  if (!date_time)
    return 'Date and time are required';
  if (!description || description.trim().length < 20)
    return 'Description must be at least 20 characters';
  if (!Array.isArray(ticketTypes))
    return 'ticketTypes must be an array';

  for (const tt of ticketTypes) {
    if (!tt.id_catalog || tt.price === undefined || !tt.capacity)
      return 'Each ticket type must have id_catalog, price, and capacity';
    if (tt.price < 0)
      return 'Ticket price cannot be negative';
    if (tt.capacity <= 0)
      return 'Ticket capacity must be greater than 0';
  }

  return null;
};

const getEvents = async (req, res) => {
  try {
    const events = await eventsService.getPublicEvents(req.query);
    return res.json(events);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await eventsService.getPublicEventById(req.params.id);
    return res.json(event);
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND')
      return res.status(404).json({ error: 'Event not found' });
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch event' });
  }
};

const getEventsAdmin = async (req, res) => {
  try {
    const events = await eventsService.getAdminEvents();
    return res.json(events);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
};

const createEvent = async (req, res) => {
  const validationError = validateCreateInput(req.body);
  if (validationError)
    return res.status(400).json({ error: validationError });

  try {
    const event = await eventsService.createEvent(req.body);
    return res.status(201).json(event);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'An event with that name already exists' });
      if (err.code === 'P2003') return res.status(400).json({ error: 'The specified category or ticket type does not exist' });
    }
    console.error('Error in createEvent:', err);
    return res.status(500).json({ error: 'Failed to create event' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const updated = await eventsService.updateEvent(req.params.id, req.body);
    return res.json(updated);
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND')
      return res.status(404).json({ error: 'Event not found or already deleted' });
    console.error('Error in updateEvent:', err);
    return res.status(500).json({ error: 'Failed to update event' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    await eventsService.deleteEvent(req.params.id);
    return res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND')
      return res.status(404).json({ error: 'Event not found or already deleted' });
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete event' });
  }
};

const restoreEvent = async (req, res) => {
  try {
    await eventsService.restoreEvent(req.params.id);
    return res.json({ message: 'Event restored successfully' });
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND_OR_ACTIVE')
      return res.status(404).json({ error: 'Event not found or already active' });
    console.error(err);
    return res.status(500).json({ error: 'Failed to restore event' });
  }
};

const registerInterest = async (req, res) => {
  try {
    const total = await eventsService.registerInterest(req.params.id, req.userId);
    return res.status(201).json({ message: 'Interest registered!', total_interests: total });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return res.status(409).json({ error: 'Already registered interest' });
    return res.status(500).json({ error: 'Failed to register interest' });
  }
};

const removeInterest = async (req, res) => {
  try {
    const total = await eventsService.removeInterest(req.params.id, req.userId);
    return res.json({ message: 'Interest removed', total_interests: total });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove interest' });
  }
};

const getInterestStatus = async (req, res) => {
  try {
    const interested = await eventsService.getInterestStatus(req.params.id, req.userId);
    return res.json({ interested });
  } catch (err) {
    return res.status(500).json({ error: 'Error checking status' });
  }
};

module.exports = {
  getEvents,
  getEventById,
  getEventsAdmin,
  createEvent,
  updateEvent,
  deleteEvent,
  restoreEvent,
  registerInterest,
  removeInterest,
  getInterestStatus,
};