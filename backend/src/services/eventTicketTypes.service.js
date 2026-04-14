const { Prisma } = require('@prisma/client');
const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');

const ettCache = new NodeCache({ stdTTL: 60 });

const CACHE_KEYS = {
  byEvent: (id) => `event-tickets:${id}`,
};

const invalidateEventTicketCache = (id_event) => {
  if (id_event) ettCache.del(CACHE_KEYS.byEvent(id_event));
};

// ── READ ─────────────────────────────────────────────────────────────────────

const getTicketTypesByEvent = async (id_event) => {
  const cacheKey = CACHE_KEYS.byEvent(id_event);
  const cached = ettCache.get(cacheKey);
  if (cached) return cached;

  const rows = await prisma.eventTicketType.findMany({
    where: { id_event: Number(id_event), deleted_at: null },
    include: {
      catalog: { select: { typeName: true } },
      purchases: { where: { status: 'completed' }, select: { quantity: true } },
    },
    orderBy: { price: 'asc' },
  });

  const data = rows.map((ett) => {
    const sold = ett.purchases.reduce((sum, p) => sum + p.quantity, 0);
    const remaining = ett.capacity - sold;
    return {
      id_event_ticket:  ett.id_event_ticket,
      id_catalog:       ett.id_catalog,
      typeName:         ett.catalog.typeName,
      price:            ett.price,
      capacity:         ett.capacity,
      tickets_sold:     sold,
      tickets_remaining: remaining,
      sold_out:         remaining <= 0,
      created_at:       ett.created_at,
    };
  });

  ettCache.set(cacheKey, data);
  return data;
};

// ── CREATE ────────────────────────────────────────────────────────────────────

const createTicketType = async (id_event, { id_catalog, price, capacity }) => {
  const event = await prisma.event.findFirst({
    where: { id_event: Number(id_event), deleted_at: null },
  });
  if (!event) throw new Error('EVENT_NOT_FOUND');

  const created = await prisma.eventTicketType.create({
    data: {
      id_event:   Number(id_event),
      id_catalog: Number(id_catalog),
      price:      Number(price),
      capacity:   Number(capacity),
    },
    include: { catalog: { select: { typeName: true } } },
  });

  invalidateEventTicketCache(Number(id_event));
  return created;
};

// ── UPDATE ────────────────────────────────────────────────────────────────────

const updateTicketType = async (id_event, id_ticket, { price, capacity }) => {
  if (capacity !== undefined) {
    const soldAgg = await prisma.purchase.aggregate({
      where: { id_event_ticket: Number(id_ticket), status: 'completed' },
      _sum: { quantity: true },
    });
    const sold = soldAgg._sum.quantity || 0;
    if (capacity < sold) {
      const err = new Error(`Cannot reduce capacity below tickets already sold. Sold: ${sold}, Requested: ${capacity}`);
      err.code = 'CAPACITY_CONFLICT';
      err.sold = sold;
      throw err;
    }
  }

  const updateData = {};
  if (price    !== undefined) updateData.price    = Number(price);
  if (capacity !== undefined) updateData.capacity = Number(capacity);

  const updated = await prisma.eventTicketType.update({
    where: { id_event_ticket: Number(id_ticket), id_event: Number(id_event) },
    data:  updateData,
    include: { catalog: { select: { typeName: true } } },
  });

  invalidateEventTicketCache(Number(id_event));
  return updated;
};

// ── SOFT DELETE ───────────────────────────────────────────────────────────────

const deleteTicketType = async (id_event, id_ticket) => {
  const soldAgg = await prisma.purchase.aggregate({
    where: { id_event_ticket: Number(id_ticket), status: 'completed' },
    _sum: { quantity: true },
  });
  const sold = soldAgg._sum.quantity || 0;
  if (sold > 0) {
    const err = new Error(`Cannot remove a ticket type that already has ${sold} ticket(s) sold.`);
    err.code = 'HAS_SALES';
    err.sold = sold;
    throw err;
  }

  const result = await prisma.eventTicketType.updateMany({
    where: { id_event_ticket: Number(id_ticket), id_event: Number(id_event), deleted_at: null },
    data:  { deleted_at: new Date() },
  });

  if (result.count === 0) throw new Error('TICKET_TYPE_NOT_FOUND');

  invalidateEventTicketCache(Number(id_event));
};

module.exports = {
  getTicketTypesByEvent,
  createTicketType,
  updateTicketType,
  deleteTicketType,
};