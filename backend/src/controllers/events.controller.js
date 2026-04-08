const { Prisma } = require('@prisma/client');
const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');

const eventCache = new NodeCache({ stdTTL: 300 });

const CACHE_KEYS = {
  public: 'events:public',
  admin:  'events:admin',
  detail: 'events:detail',
};

const invalidateEventCache = () => {
  eventCache.flushAll();
};

const getEvents = async (req, res) => {
  try {
    const { name, category_id } = req.query;

    const cacheKey = `${CACHE_KEYS.public}:name=${name ?? 'all'}:cat=${category_id ?? 'all'}`;
    const cached = eventCache.get(cacheKey);
    if (cached) return res.json(cached);

    const events = await prisma.event.findMany({
      where: {
        deleted_at: null,
        ...(name && { eventName: { contains: name, mode: 'insensitive' } }),
        ...(category_id && { id_category: Number(category_id) }),
      },
      include: {
        category: true,
        images: { where: { type: 'poster' }, take: 1 },
        ticketTypes: {
          where: { deleted_at: null },
          include: {
            catalog: { select: { typeName: true } }
          },
          orderBy: { price: 'asc' }
        }
      },
      orderBy: { date_time: 'asc' },
    });

    const now = new Date();
    const completedThreshold = new Date(now);
    completedThreshold.setDate(completedThreshold.getDate() - 1);

    // Transformar para incluir min/max price, total capacity e is_completed
    const eventsWithPricing = events
      .map(event => ({
        ...event,
        is_completed: event.date_time <= completedThreshold,
        min_price: event.ticketTypes.length > 0 ? Math.min(...event.ticketTypes.map(tt => tt.price)) : null,
        max_price: event.ticketTypes.length > 0 ? Math.max(...event.ticketTypes.map(tt => tt.price)) : null,
        total_capacity: event.ticketTypes.reduce((sum, tt) => sum + tt.capacity, 0),
      }))
      // Activos primero, completados al final; dentro de cada grupo por date_time asc
      .sort((a, b) => {
        if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
        return new Date(a.date_time).getTime() - new Date(b.date_time).getTime();
      });

    eventCache.set(cacheKey, eventsWithPricing);
    res.json(eventsWithPricing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

const getEventById = async (req, res) => {
  const { id } = req.params;
  const cacheKey = `${CACHE_KEYS.detail}:${id}`;

  const cached = eventCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const event = await prisma.event.findFirst({
      where: { id_event: Number(id), deleted_at: null },
      include: {
        category: true,
        images: { where: { type: 'poster' }, take: 1 },
        // NUEVO: Incluir tipos de tickets con su catálogo
        ticketTypes: {
          where: { deleted_at: null },
          include: {
            catalog: { select: { typeName: true } }
          },
          orderBy: { price: 'asc' }
        }
      },
    });

    if (!event) return res.status(404).json({ error: 'Event not found' });

    const completedThreshold = new Date();
    completedThreshold.setDate(completedThreshold.getDate() - 1);

    // Agregar metadatos de pricing e is_completed
    const eventWithPricing = {
      ...event,
      is_completed: event.date_time <= completedThreshold,
      min_price: event.ticketTypes.length > 0 ? Math.min(...event.ticketTypes.map(tt => tt.price)) : null,
      max_price: event.ticketTypes.length > 0 ? Math.max(...event.ticketTypes.map(tt => tt.price)) : null,
      total_capacity: event.ticketTypes.reduce((sum, tt) => sum + tt.capacity, 0),
    };

    eventCache.set(cacheKey, eventWithPricing);
    res.json(eventWithPricing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};

const getEventsAdmin = async (req, res) => {
  const cached = eventCache.get(CACHE_KEYS.admin);
  if (cached) return res.json(cached);

  try {
    const events = await prisma.event.findMany({
      include: {
        category: true,
        images: { where: { type: 'poster' }, take: 1 },
        ticketTypes: {
          include: { catalog: { select: { typeName: true } } }
        }
      },
      orderBy: { id_event: 'desc' },
    });

    eventCache.set(CACHE_KEYS.admin, events);
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

const createEvent = async (req, res) => {
  const { eventName, id_category, description, location, date_time, image_url, ticketTypes } = req.body;

  if (!eventName || !/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/.test(eventName))
    return res.status(400).json({ error: 'Invalid name: only letters, numbers and spaces allowed' });
  if (!id_category)
    return res.status(400).json({ error: 'Category is required' });
  if (!date_time)
    return res.status(400).json({ error: 'Date and time are required' });
  if (!description || description.trim().length < 20)
    return res.status(400).json({ error: 'Description must be at least 20 characters' });
  if (!Array.isArray(ticketTypes))
    return res.status(400).json({ error: 'ticketTypes must be an array' });

  const isPaid = ticketTypes.length > 0;

  // Validar estructura solo si el evento es de pago
  if (isPaid) {
    for (const tt of ticketTypes) {
      if (!tt.id_catalog || tt.price === undefined || !tt.capacity)
        return res.status(400).json({ error: 'Each ticket type must have id_catalog, price, and capacity' });
      if (tt.price < 0)
        return res.status(400).json({ error: 'Ticket price cannot be negative' });
      if (tt.capacity <= 0)
        return res.status(400).json({ error: 'Ticket capacity must be greater than 0' });
    }
  }

  try {
    const event = await prisma.$transaction(async (tx) => {
      // 1. Crear evento
      const newEvent = await tx.event.create({
        data: {
          eventName:   eventName.trim(),
          id_category: Number(id_category),
          description: description.trim(),
          location:    location.trim(),
          date_time:   new Date(date_time),
          ...(image_url?.trim() && {
            images: {
              create: { image_url: image_url.trim(), type: 'poster' },
            },
          }),
        },
      });

      // 2. Crear tipos de tickets (solo si el evento es de pago)
      if (isPaid) {
        await tx.eventTicketType.createMany({
          data: ticketTypes.map(tt => ({
            id_event:   newEvent.id_event,
            id_catalog: Number(tt.id_catalog),
            price:      Number(tt.price),
            capacity:   Number(tt.capacity),
          })),
        });
      }

      return newEvent;
    });

    invalidateEventCache();
    res.status(201).json(event);
  } catch (err) {
    console.error('Error in createEvent:', err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'An event with that name already exists' });
      if (err.code === 'P2003') return res.status(400).json({ error: 'The specified category or ticket type does not exist' });
    }
    res.status(500).json({ error: 'Failed to create event' });
  }
};

const updateEvent = async (req, res) => {
  const { id } = req.params;
  const { eventName, id_category, description, location, date_time, image_url } = req.body;

  try {
    const existing = await prisma.event.findFirst({
      where: { id_event: Number(id), deleted_at: null },
    });

    if (!existing)
      return res.status(404).json({ error: 'Event not found or already deleted' });

    const updated = await prisma.event.update({
      where: { id_event: Number(id) },
      data: {
        ...(eventName    && { eventName: eventName.trim() }),
        ...(id_category && { id_category: Number(id_category) }),
        ...(description && { description: description.trim() }),
        ...(location    && { location: location.trim() }),
        ...(date_time !== undefined && { date_time: new Date(date_time) }),
      },
    });

    if (image_url !== undefined) {
      await prisma.eventImage.deleteMany({
        where: { id_event: Number(id), type: 'poster' },
      });

      if (image_url.trim() !== '') {
        await prisma.eventImage.create({
          data: { id_event: Number(id), image_url: image_url.trim(), type: 'poster' },
        });
      }
    }

    invalidateEventCache();
    res.json(updated);
  } catch (err) {
    console.error('Error in updateEvent:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

const deleteEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await prisma.event.updateMany({
      where: { id_event: Number(id), deleted_at: null },
      data: { deleted_at: new Date() },
    });

    if (result.count === 0)
      return res.status(404).json({ error: 'Event not found or already deleted' });

    invalidateEventCache();
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

const restoreEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await prisma.event.updateMany({
      where: { id_event: Number(id), deleted_at: { not: null } },
      data: { deleted_at: null },
    });

    if (result.count === 0)
      return res.status(404).json({ error: 'Event not found or already active' });

    invalidateEventCache();
    res.json({ message: 'Event restored successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to restore event' });
  }
};

const registerInterest = async (req, res) => {
  const { id } = req.params;
  const id_user = req.userId;

  try {
    await prisma.interest.create({
      data: {
        id_event: Number(id),
        user_identifier: String(id_user),
      },
    });

    const total = await prisma.interest.count({ where: { id_event: Number(id) } });
    invalidateEventCache();

    res.status(201).json({ message: 'Interest registered!', total_interests: total });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return res.status(409).json({ error: 'Already registered interest' });
    res.status(500).json({ error: 'Failed to register interest' });
  }
};

const removeInterest = async (req, res) => {
  const { id } = req.params;
  const id_user = req.userId;

  try {
    await prisma.interest.delete({
      where: {
        id_event_user_identifier: {
          id_event: Number(id),
          user_identifier: String(id_user),
        },
      },
    });

    const total = await prisma.interest.count({ where: { id_event: Number(id) } });
    invalidateEventCache();

    res.json({ message: 'Interest removed', total_interests: total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove interest' });
  }
};

const getInterestStatus = async (req, res) => {
  const { id } = req.params;
  const id_user = req.userId;

  try {
    const interest = await prisma.interest.findUnique({
      where: {
        id_event_user_identifier: {
          id_event: Number(id),
          user_identifier: String(id_user),
        },
      },
    });
    res.json({ interested: !!interest });
  } catch (err) {
    res.status(500).json({ error: 'Error checking status' });
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