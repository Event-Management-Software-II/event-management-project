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
        ...(name && { NameEvent: { contains: name, mode: 'insensitive' } }),
        ...(category_id && { Id_category: Number(category_id) }),
      },
      include: {
        category: true,
        images: { where: { type: 'poster' }, take: 1 },
      },
      orderBy: { id_event: 'desc' },
    });

    eventCache.set(cacheKey, events);

    res.json(events);
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
      },
    });

    if (!event) return res.status(404).json({ error: 'Event not found' });

    eventCache.set(cacheKey, event);

    res.json(event);
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
  const { NameEvent, Id_category, value, description, location, date_time, imageUrl } = req.body;

  if (!NameEvent || !/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/.test(NameEvent))
    return res.status(400).json({ error: 'Invalid name' });
  if (!Id_category)
    return res.status(400).json({ error: 'Category is required' });
  if (value === undefined || Number.isNaN(Number(value)) || Number(value) < 0)
    return res.status(400).json({ error: 'Value must be a number >= 0' });
  if (!description || description.trim().length < 20)
    return res.status(400).json({ error: 'Description must be at least 20 characters' });
  if (!location || location.trim() === '')
    return res.status(400).json({ error: 'Location is required' });

  try {
    const event = await prisma.event.create({
      data: {
        NameEvent: NameEvent.trim(),
        Id_category: Number(Id_category),
        value: Number(value),
        description: description.trim(),
        location: location.trim(),
        date_time: date_time ? new Date(date_time) : null,
        ...(imageUrl?.trim() && {
          images: {
            create: { imageUrl: imageUrl.trim(), type: 'poster' },
          },
        }),
      },
    });

    invalidateEventCache(); 

    res.status(201).json(event);
  } catch (err) {
    console.error('Error in createEvent:', err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'An event with that name already exists' });
      if (err.code === 'P2003') return res.status(400).json({ error: 'The specified category does not exist' });
    }
    res.status(500).json({ error: 'Failed to create event' });
  }
};

const updateEvent = async (req, res) => {
  const { id } = req.params;
  const { NameEvent, Id_category, value, description, location, date_time, imageUrl } = req.body;

  if (NameEvent && !/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/.test(NameEvent))
    return res.status(400).json({ error: 'Invalid name' });
  if (value !== undefined && (Number.isNaN(Number(value)) || Number(value) < 0))
    return res.status(400).json({ error: 'Value must be >= 0' });
  if (description && description.trim().length < 20)
    return res.status(400).json({ error: 'Description must be at least 20 characters' });

  try {
    const existing = await prisma.event.findFirst({
      where: { id_event: Number(id), deleted_at: null },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Event not found or already deleted' });
    }

    const updated = await prisma.event.update({
      where: { id_event: Number(id) },
      data: {
        ...(NameEvent   && { NameEvent: NameEvent.trim() }),
        ...(Id_category && { Id_category: Number(Id_category) }),
        ...(value !== undefined && { value: Number(value) }),
        ...(description && { description: description.trim() }),
        ...(location    && { location: location.trim() }),
        ...(date_time !== undefined && { date_time: date_time ? new Date(date_time) : null }),
      },
    });

    if (imageUrl !== undefined) {
      await prisma.eventImage.deleteMany({
        where: { id_event: Number(id), type: 'poster' },
      });

      if (imageUrl.trim() !== '') {
        await prisma.eventImage.create({
          data: {
            id_event: Number(id),
            imageUrl: imageUrl.trim(),
            type: 'poster',
          },
        });
      }
    }

    invalidateEventCache();

    res.json(updated);
  } catch (err) {
    console.error('Error in updateEvent:', err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return res.status(409).json({ error: 'An event with that name already exists' });
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

    if (result.count === 0) {
      return res.status(404).json({ error: 'Event not found or already deleted' });
    }

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

    if (result.count === 0) {
      return res.status(404).json({ error: 'Event not found or already active' });
    }

    invalidateEventCache(); 

    res.json({ message: 'Event restored successfully' });
  } catch (err) {
    console.error('Error in restoreEvent:', err);
    res.status(500).json({ error: 'Failed to restore event' });
  }
};
const registerInterest = async (req, res) => {
  const { id } = req.params;
  const id_user = req.userId;

  try {
    const event = await prisma.event.findFirst({
      where: { id_event: Number(id), deleted_at: null },
    });

    if (!event) return res.status(404).json({ error: 'Event not found' });

    await prisma.interest.create({
      data: {
        id_event: Number(id),
        user_identifier: String(id_user),
      },
    });

    const total = await prisma.interest.count({
      where: { id_event: Number(id) },
    });

    invalidateEventCache(); 

    res.status(201).json({
      message: 'Interest registered!',
      total_interests: total,
    });
  } catch (err) {
    console.error('Error in registerInterest:', err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return res.status(409).json({ error: 'You already registered interest in this event' });
    res.status(500).json({ error: 'Failed to register interest' });
  }
};

const removeInterest = async (req, res) => {
  const { id } = req.params;
  const id_user = req.userId;

  try {
    const result = await prisma.interest.deleteMany({
      where: {
        id_event: Number(id),
        user_identifier: String(id_user),
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'No interest found to remove' });
    }

    const total = await prisma.interest.count({
      where: { id_event: Number(id) },
    });

    invalidateEventCache(); 

    res.json({
      message: 'Interest removed',
      total_interests: total,
    });
  } catch (err) {
    console.error('Error in removeInterest:', err);
    res.status(500).json({ error: 'Failed to remove interest' });
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