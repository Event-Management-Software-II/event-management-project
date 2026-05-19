const { randomUUID } = require('crypto');
const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');
const { processPayment } = require('./payment.service');

const purchaseCache = new NodeCache({ stdTTL: 60 });

const CACHE_KEYS = {
  byUser: (id_user) => `purchases:${id_user}`,
};

const invalidatePurchaseCache = (id_user) =>
  purchaseCache.del(CACHE_KEYS.byUser(id_user));

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Determina el estado del evento según su fecha:
 * - Si la fecha es futura → "Activo"
 * - Si la fecha ya pasó   → "Finalizado"
 */
const getEventStatus = (dateTime) => {
  if (!dateTime) return 'Activo';
  return new Date(dateTime) > new Date() ? 'Activo' : 'Finalizado';
};

const mapPurchase = (p) => {
  // Mapeo seguro de estados de pago internos a etiquetas legibles
  const paymentLabels = {
    completed: 'Pagado',
    pending: 'Pendiente',
    cancelled: 'Cancelado',
  };

  return {
    idPurchase: p.id_purchase,
    idEvent: p.ticketType.event.id_event,
    eventName: p.ticketType.event.eventName,
    category: p.ticketType.event.category.categoryName,
    location: p.ticketType.event.location,
    dateTime: p.ticketType.event.date_time,
    imageUrl: p.ticketType.event.images[0]?.image_url ?? null,
    ticketType: p.ticketType.catalog.typeName,
    idEventTicket: p.id_event_ticket,
    quantity: p.quantity,
    unitPrice: p.unit_price,
    totalPrice: p.total_price ?? p.quantity * p.unit_price,
    status: p.status,
    // Estado del evento según la fecha (Activo / Finalizado)
    eventStatus: getEventStatus(p.ticketType.event.date_time),
    // Estado del pago dinámico mapeado (Pagado / Pendiente / Cancelado)
    paymentStatus: paymentLabels[p.status] || 'Pendiente',
    qrCode: p.qr_code,
    createdAt: p.created_at,
    tickets: p.tickets.map((t) => ({
      idTicket: t.id_ticket,
      ticketNumber: t.ticket_number,
      qrCode: t.qr_code,
      createdAt: t.created_at,
    })),
  };
};

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
      user: { deleted_at: null },
      event: { deleted_at: null },
    },
    include: {
      ticketType: {
        include: {
          catalog: { select: { typeName: true } },
          event: {
            include: {
              category: true,
              images: { where: { type: 'poster' }, take: 1 },
            },
          },
        },
      },
      tickets: {
        select: {
          id_ticket: true,
          ticket_number: true,
          qr_code: true,
          created_at: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  const data = purchases.map(mapPurchase);
  purchaseCache.set(cacheKey, data);
  return data;
};

// ── CREATE ────────────────────────────────────────────────────────────────────

const createPurchase = async (
  id_user,
  { id_event_ticket, quantity, pan, cvv, cardHolder }
) => {
  // 1. Verificar que el tipo de ticket existe, evento activo y futuro
  const eventTicketType = await prisma.eventTicketType.findFirst({
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
  const soldAgg = await prisma.purchase.aggregate({
    where: { id_event_ticket: Number(id_event_ticket), status: 'completed' },
    _sum: { quantity: true },
  });

  const sold = soldAgg._sum.quantity || 0;
  const available = eventTicketType.capacity - sold;

  if (quantity > available) {
    const err = new Error('NOT_ENOUGH_TICKETS');
    err.available = available;
    throw err;
  }

  // 3. Procesar pago (solo si el ticket tiene precio)
  if (eventTicketType.price > 0) {
    if (!pan || !cvv || !cardHolder) {
      const err = new Error('PAYMENT_DATA_REQUIRED');
      throw err;
    }

    const amount = eventTicketType.price * Number(quantity);
    const externalReference = `EVT-${id_event_ticket}-USR-${id_user}-${randomUUID().slice(0, 8)}`;

    const payment = await processPayment({
      amount,
      currency: 'COP',
      pan,
      cvv,
      cardHolder,
      externalReference,
      description: `${quantity}x ${eventTicketType.catalog.typeName} — ${eventTicketType.event.eventName}`,
    });

    if (!payment.ok) {
      const err = new Error('PAYMENT_GATEWAY_ERROR');
      err.details = payment.error;
      throw err;
    }

    if (!payment.approved) {
      const err = new Error('PAYMENT_REJECTED');
      err.details =
        payment.data?.error || 'El pago fue rechazado por el proveedor.';
      throw err;
    }
  }

  // 4. Crear la compra y tickets en una transacción
  const purchase = await prisma.$transaction(async (tx) => {
    const newPurchase = await tx.purchase.create({
      data: {
        id_user: Number(id_user),
        id_event: eventTicketType.id_event,
        id_event_ticket: Number(id_event_ticket),
        quantity: Number(quantity),
        unit_price: eventTicketType.price,
        status: 'completed',
      },
    });

    const ticketsData = Array.from({ length: quantity }, (_, i) => {
      const ticketNumber = buildTicketNumber(
        eventTicketType.event.eventName,
        eventTicketType.id_event_ticket,
        i
      );
      return {
        id_purchase: newPurchase.id_purchase,
        ticket_number: ticketNumber,
        qr_code: `QR-${ticketNumber}`,
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
