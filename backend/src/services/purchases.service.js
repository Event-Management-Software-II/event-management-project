const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');

const purchaseCache = new NodeCache({ stdTTL: 60 });

const CACHE_KEYS = {
  byUser: (id_user) => `purchases:${id_user}`,
};

const invalidatePurchaseCache = (id_user) => purchaseCache.del(CACHE_KEYS.byUser(id_user));

// ── Helpers ───────────────────────────────────────────────────────────────────

const mapPurchase = (p) => ({
  idPurchase:    p.id_purchase,
  idEvent:       p.ticketType.event.id_event,
  eventName:     p.ticketType.event.eventName,
  category:      p.ticketType.event.category.categoryName,
  location:      p.ticketType.event.location,
  dateTime:      p.ticketType.event.date_time,
  imageUrl:      p.ticketType.event.images[0]?.image_url ?? null,
  ticketType:    p.ticketType.catalog.typeName,
  idEventTicket: p.id_event_ticket,
  quantity:      p.quantity,
  unitPrice:     p.unit_price,
  totalPrice:    p.total_price ?? p.quantity * p.unit_price,
  status:        p.status,
  qrCode:        p.qr_code,
  createdAt:     p.created_at,
  tickets:       p.tickets.map((t) => ({
    idTicket:     t.id_ticket,
    ticketNumber: t.ticket_number,
    qrCode:       t.qr_code,
    createdAt:    t.created_at,
  })),
});

const buildTicketNumber = (eventName, id_event_ticket, index) =>
  `${eventName.substring(0, 3).toUpperCase()}${String(id_event_ticket).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}${index}`;

// ── READ ──────────────────────────────────────────────────────────────────────

const getPurchasesByUser = async (id_user) => {
  const cacheKey = CACHE_KEYS.byUser(id_user);
  const cached = purchaseCache.get(cacheKey);
  if (cached) return cached;

  const purchases = await prisma.purchase.findMany({
    where: {
      id_user: Number(id_user),
      user:    { deleted_at: null },
      event:   { deleted_at: null },
    },
    include: {
      ticketType: {
        include: {
          catalog: { select: { typeName: true } },
          event: {
            include: {
              category: true,
              images:   { where: { type: 'poster' }, take: 1 },
            },
          },
        },
      },
      tickets: {
        select: { id_ticket: true, ticket_number: true, qr_code: true, created_at: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  const data = purchases.map(mapPurchase);
  purchaseCache.set(cacheKey, data);
  return data;
};

// ── CREATE ────────────────────────────────────────────────────────────────────

const createPurchase = async (id_user, { id_event_ticket, quantity }) => {
  const purchase = await prisma.$transaction(async (tx) => {
    // 1. Verificar que el tipo de ticket existe, evento activo y futuro
    const eventTicketType = await tx.eventTicketType.findFirst({
      where: {
        id_event_ticket: Number(id_event_ticket),
        deleted_at: null,
        event: { deleted_at: null, date_time: { gt: new Date() } },
      },
      include: { event: true, catalog: true },
    });

    if (!eventTicketType) {
      const err = new Error('TICKET_TYPE_NOT_FOUND');
      throw err;
    }

    // 2. Verificar disponibilidad
    const soldAgg = await tx.purchase.aggregate({
      where: { id_event_ticket: Number(id_event_ticket), status: 'completed' },
      _sum: { quantity: true },
    });

    const sold      = soldAgg._sum.quantity || 0;
    const available = eventTicketType.capacity - sold;

    if (quantity > available) {
      const err = new Error('NOT_ENOUGH_TICKETS');
      err.available = available;
      throw err;
    }

    // 3. Crear la compra
    const newPurchase = await tx.purchase.create({
      data: {
        id_user:         Number(id_user),
        id_event:        eventTicketType.id_event,
        id_event_ticket: Number(id_event_ticket),
        quantity:        Number(quantity),
        unit_price:      eventTicketType.price,
        status:          'completed', // cambiar a 'pending' cuando haya pasarela de pagos
      },
    });

    // 4. Generar tickets individuales
    const ticketsData = Array.from({ length: quantity }, (_, i) => {
      const ticketNumber = buildTicketNumber(
        eventTicketType.event.eventName,
        eventTicketType.id_event_ticket,
        i,
      );
      return {
        id_purchase:   newPurchase.id_purchase,
        ticket_number: ticketNumber,
        qr_code:       `QR-${ticketNumber}`,
      };
    });

    await tx.ticket.createMany({ data: ticketsData });

    return newPurchase;
  });

  invalidatePurchaseCache(id_user);
  return purchase;
};

module.exports = {
  getPurchasesByUser,
  createPurchase,
};