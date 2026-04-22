const { Prisma } = require('@prisma/client');
const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');

const eventCache = new NodeCache({ stdTTL: 300 });

const CACHE_KEYS = {
  public: 'events:public',
  admin: 'events:admin',
  detail: 'events:detail',
};

const invalidateEventCache = () => eventCache.flushAll();

const EVENT_INCLUDE = {
  category: true,
  images: { where: { type: 'poster' }, take: 1 },
  ticketTypes: {
    where: { deleted_at: null },
    include: { catalog: { select: { typeName: true } } },
    orderBy: { price: 'asc' },
  },
};

const enrichEvent = (event) => {
  const completedThreshold = new Date();
  completedThreshold.setDate(completedThreshold.getDate() - 1);
  return {
    ...event,
    is_completed: event.date_time <= completedThreshold,
    min_price:
      event.ticketTypes.length > 0
        ? Math.min(...event.ticketTypes.map((tt) => tt.price))
        : null,
    max_price:
      event.ticketTypes.length > 0
        ? Math.max(...event.ticketTypes.map((tt) => tt.price))
        : null,
    total_capacity: event.ticketTypes.reduce((sum, tt) => sum + tt.capacity, 0),
  };
};

const getPublicEvents = async ({ name, category_id } = {}) => {
  const cacheKey = `${CACHE_KEYS.public}:name=${name ?? 'all'}:cat=${category_id ?? 'all'}`;
  const cached = eventCache.get(cacheKey);
  if (cached) return cached;

  const events = await prisma.event.findMany({
    where: {
      deleted_at: null,
      ...(name && { eventName: { contains: name, mode: 'insensitive' } }),
      ...(category_id && { id_category: Number(category_id) }),
    },
    include: EVENT_INCLUDE,
    orderBy: { date_time: 'asc' },
  });

  const result = events.map(enrichEvent).sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    return new Date(a.date_time) - new Date(b.date_time);
  });

  eventCache.set(cacheKey, result);
  return result;
};

const getPublicEventById = async (id) => {
  const cacheKey = `${CACHE_KEYS.detail}:${id}`;
  const cached = eventCache.get(cacheKey);
  if (cached) return cached;

  const event = await prisma.event.findFirst({
    where: { id_event: Number(id), deleted_at: null },
    include: EVENT_INCLUDE,
  });

  if (!event) throw new Error('EVENT_NOT_FOUND');

  const result = enrichEvent(event);
  eventCache.set(cacheKey, result);
  return result;
};

const getAdminEvents = async () => {
  const cached = eventCache.get(CACHE_KEYS.admin);
  if (cached) return cached;

  const events = await prisma.event.findMany({
    include: {
      category: true,
      images: { where: { type: 'poster' }, take: 1 },
      ticketTypes: { include: { catalog: { select: { typeName: true } } } },
    },
    orderBy: { id_event: 'desc' },
  });

  eventCache.set(CACHE_KEYS.admin, events);
  return events;
};

const createEvent = async ({
  eventName,
  id_category,
  description,
  location,
  date_time,
  image_url,
  ticketTypes,
}) => {
  const isPaid = ticketTypes.length > 0;

  const event = await prisma.$transaction(async (tx) => {
    const newEvent = await tx.event.create({
      data: {
        eventName: eventName.trim(),
        id_category: Number(id_category),
        description: description.trim(),
        location: location.trim(),
        date_time: new Date(date_time),
        ...(image_url?.trim() && {
          images: { create: { image_url: image_url.trim(), type: 'poster' } },
        }),
      },
    });

    if (isPaid) {
      await tx.eventTicketType.createMany({
        data: ticketTypes.map((tt) => ({
          id_event: newEvent.id_event,
          id_catalog: Number(tt.id_catalog),
          price: Number(tt.price),
          capacity: Number(tt.capacity),
        })),
      });
    }

    return newEvent;
  });

  invalidateEventCache();
  return event;
};

const updateEvent = async (
  id,
  { eventName, id_category, description, location, date_time, image_url }
) => {
  const existing = await prisma.event.findFirst({
    where: { id_event: Number(id), deleted_at: null },
  });

  if (!existing) throw new Error('EVENT_NOT_FOUND');

  const updated = await prisma.event.update({
    where: { id_event: Number(id) },
    data: {
      ...(eventName && { eventName: eventName.trim() }),
      ...(id_category && { id_category: Number(id_category) }),
      ...(description && { description: description.trim() }),
      ...(location && { location: location.trim() }),
      ...(date_time !== undefined && { date_time: new Date(date_time) }),
    },
  });

  if (image_url !== undefined) {
    await prisma.eventImage.deleteMany({
      where: { id_event: Number(id), type: 'poster' },
    });
    if (image_url.trim() !== '') {
      await prisma.eventImage.create({
        data: {
          id_event: Number(id),
          image_url: image_url.trim(),
          type: 'poster',
        },
      });
    }
  }

  invalidateEventCache();
  return updated;
};

const deleteEvent = async (id) => {
  const result = await prisma.event.updateMany({
    where: { id_event: Number(id), deleted_at: null },
    data: { deleted_at: new Date() },
  });

  if (result.count === 0) throw new Error('EVENT_NOT_FOUND');
  invalidateEventCache();
};

const restoreEvent = async (id) => {
  const result = await prisma.event.updateMany({
    where: { id_event: Number(id), deleted_at: { not: null } },
    data: { deleted_at: null },
  });

  if (result.count === 0) throw new Error('EVENT_NOT_FOUND_OR_ACTIVE');
  invalidateEventCache();
};

const registerInterest = async (eventId, userId) => {
  await prisma.interest.create({
    data: { id_event: Number(eventId), user_identifier: String(userId) },
  });

  const total = await prisma.interest.count({
    where: { id_event: Number(eventId) },
  });
  invalidateEventCache();
  return total;
};

const removeInterest = async (eventId, userId) => {
  await prisma.interest.delete({
    where: {
      id_event_user_identifier: {
        id_event: Number(eventId),
        user_identifier: String(userId),
      },
    },
  });

  const total = await prisma.interest.count({
    where: { id_event: Number(eventId) },
  });
  invalidateEventCache();
  return total;
};

const getInterestStatus = async (eventId, userId) => {
  const interest = await prisma.interest.findUnique({
    where: {
      id_event_user_identifier: {
        id_event: Number(eventId),
        user_identifier: String(userId),
      },
    },
  });

  return !!interest;
};

module.exports = {
  getPublicEvents,
  getPublicEventById,
  getAdminEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  restoreEvent,
  registerInterest,
  removeInterest,
  getInterestStatus,
};
