const eventTicketTypesService = require('../services/eventTicketTypes.service');

const getEventTicketTypes = async (req, res) => {
  try {
    const data = await eventTicketTypesService.getTicketTypesByEvent(
      req.params.id
    );
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch ticket types' });
  }
};

const createEventTicketType = async (req, res) => {
  try {
    const data = await eventTicketTypesService.createTicketType(
      req.params.id,
      req.body
    );
    return res.status(201).json(data);
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND')
      return res.status(404).json({ error: 'Event not found' });
    console.error(err);
    return res.status(500).json({ error: 'Failed to create ticket type' });
  }
};

const updateEventTicketType = async (req, res) => {
  try {
    const data = await eventTicketTypesService.updateTicketType(
      req.params.id,
      req.params.id_ticket,
      req.body
    );
    return res.json(data);
  } catch (err) {
    if (err.code === 'CAPACITY_CONFLICT')
      return res.status(409).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Failed to update ticket type' });
  }
};

const softDeleteEventTicketType = async (req, res) => {
  try {
    await eventTicketTypesService.deleteTicketType(
      req.params.id,
      req.params.id_ticket
    );
    return res.json({ message: 'Ticket type deleted successfully' });
  } catch (err) {
    if (err.code === 'HAS_SALES')
      return res.status(409).json({ error: err.message });
    if (err.message === 'TICKET_TYPE_NOT_FOUND')
      return res.status(404).json({ error: 'Ticket type not found' });
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete ticket type' });
  }
};

module.exports = {
  getEventTicketTypes,
  createEventTicketType,
  updateEventTicketType,
  softDeleteEventTicketType,
};
