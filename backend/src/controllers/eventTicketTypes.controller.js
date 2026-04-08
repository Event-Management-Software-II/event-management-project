const { Prisma } = require('@prisma/client');
const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');

const ettCache = new NodeCache({ stdTTL: 60 });

const CACHE_KEYS = {
  byEvent: (id) => `event-tickets:${id}`,
};

const invalidateEventTicketCache = (id_event) => {
  if (id_event) {
    ettCache.del(CACHE_KEYS.byEvent(id_event));
  }
};

// GET /api/events/:id/ticket-types — Listar tipos de tickets de un evento con disponibilidad
const getEventTicketTypes = async (req, res) => {
  const { id } = req.params;
  const cacheKey = CACHE_KEYS.byEvent(id);

  const cached = ettCache.get(cacheKey);
  if (cached) return res.json({ ok: true, data: cached });

  try {
    const eventTicketTypes = await prisma.eventTicketType.findMany({
      where: {
        id_event: Number(id),
        deleted_at: null,
      },
      include: {
        catalog: {
          select: { typeName: true },
        },
        // Contar tickets vendidos (purchases completadas)
        purchases: {
          where: { status: 'completed' },
          select: { quantity: true },
        },
      },
      orderBy: { price: 'asc' },
    });

    // Calcular disponibilidad real
    const data = eventTicketTypes.map(ett => {
      const sold = ett.purchases.reduce((sum, p) => sum + p.quantity, 0);
      const remaining = ett.capacity - sold;
      
      return {
        id_event_ticket: ett.id_event_ticket,
        id_catalog: ett.id_catalog,
        typeName: ett.catalog.typeName,
        price: ett.price,
        capacity: ett.capacity,
        tickets_sold: sold,
        tickets_remaining: remaining,
        sold_out: remaining <= 0,
        created_at: ett.created_at,
      };
    });

    ettCache.set(cacheKey, data);
    res.json({ ok: true, data });
  } catch (err) {
    console.error('Error in getEventTicketTypes:', err);
    res.status(500).json({ error: 'Failed to fetch event ticket types' });
  }
};

// POST /api/events/:id/ticket-types — Agregar tipo de ticket a evento existente (Admin only)
const createEventTicketType = async (req, res) => {
  const { id } = req.params; // id_event
  const { id_catalog, price, capacity } = req.body;

  if (!id_catalog || price === undefined || !capacity) {
    return res.status(400).json({ error: 'id_catalog, price, and capacity are required' });
  }

  if (price < 0) {
    return res.status(400).json({ error: 'Price cannot be negative' });
  }

  if (capacity <= 0) {
    return res.status(400).json({ error: 'Capacity must be greater than 0' });
  }

  try {
    // Verificar que el evento existe y está activo
    const event = await prisma.event.findFirst({
      where: { id_event: Number(id), deleted_at: null },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventTicketType = await prisma.eventTicketType.create({
      data: {
        id_event: Number(id),
        id_catalog: Number(id_catalog),
        price: Number(price),
        capacity: Number(capacity),
      },
      include: {
        catalog: { select: { typeName: true } },
      },
    });

    invalidateEventTicketCache(Number(id));
    res.status(201).json({ ok: true, data: eventTicketType });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        return res.status(409).json({ error: 'This ticket type is already assigned to the event' });
      }
      if (err.code === 'P2003') {
        return res.status(400).json({ error: 'Invalid catalog type or event' });
      }
    }
    console.error('Error in createEventTicketType:', err);
    res.status(500).json({ error: 'Failed to assign ticket type to event' });
  }
};

// PUT /api/events/:id/ticket-types/:id_ticket — Actualizar precio/capacidad (Admin only)
const updateEventTicketType = async (req, res) => {
  const { id, id_ticket } = req.params; // id = id_event, id_ticket = id_event_ticket
  const { price, capacity } = req.body;

  if (price === undefined && capacity === undefined) {
    return res.status(400).json({ error: 'At least one field (price or capacity) is required' });
  }

  try {
    // Validaciones de negocio previas
    if (capacity !== undefined) {
      // Verificar tickets vendidos actuales
      const soldAgg = await prisma.purchase.aggregate({
        where: {
          id_event_ticket: Number(id_ticket),
          status: 'completed',
        },
        _sum: { quantity: true },
      });

      const sold = soldAgg._sum.quantity || 0;
      if (capacity < sold) {
        return res.status(409).json({
          error: `Cannot reduce capacity below tickets already sold. Sold: ${sold}, Requested: ${capacity}`,
        });
      }
    }

    const updateData = {};
    if (price !== undefined) updateData.price = Number(price);
    if (capacity !== undefined) updateData.capacity = Number(capacity);

    const updated = await prisma.eventTicketType.update({
      where: { 
        id_event_ticket: Number(id_ticket),
        // Asegurar que pertenece al evento correcto
        id_event: Number(id),
      },
      data: updateData,
      include: {
        catalog: { select: { typeName: true } },
      },
    });

    invalidateEventTicketCache(Number(id));
    res.json({ ok: true, data: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Ticket type not found for this event' });
      }
    }
    // Capturar error del trigger de capacidad (por si acaso)
    if (err.message && err.message.includes('Cannot reduce capacity')) {
      return res.status(409).json({ error: err.message });
    }
    console.error('Error in updateEventTicketType:', err);
    res.status(500).json({ error: 'Failed to update ticket type' });
  }
};

// DELETE /api/events/:id/ticket-types/:id_ticket — Soft delete tipo de ticket del evento (Admin only)
// Solo permite si no tiene ventas
const softDeleteEventTicketType = async (req, res) => {
  const { id, id_ticket } = req.params; // id = id_event, id_ticket = id_event_ticket

  try {
    // Verificar si tiene ventas completadas
    const soldAgg = await prisma.purchase.aggregate({
      where: {
        id_event_ticket: Number(id_ticket),
        status: 'completed',
      },
      _sum: { quantity: true },
    });

    const sold = soldAgg._sum.quantity || 0;
    if (sold > 0) {
      return res.status(409).json({
        error: `Cannot remove a ticket type that already has ${sold} ticket(s) sold.`,
      });
    }

    const result = await prisma.eventTicketType.updateMany({
      where: { 
        id_event_ticket: Number(id_ticket),
        id_event: Number(id),
        deleted_at: null,
      },
      data: { deleted_at: new Date() },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Ticket type not found or already deleted' });
    }

    invalidateEventTicketCache(Number(id));
    res.json({ message: 'Ticket type removed from event successfully' });
  } catch (err) {
    // Capturar error del trigger por si acaso
    if (err.message && err.message.includes('Cannot remove a ticket type')) {
      return res.status(409).json({ error: err.message });
    }
    console.error('Error in softDeleteEventTicketType:', err);
    res.status(500).json({ error: 'Failed to remove ticket type' });
  }
};

module.exports = {
  getEventTicketTypes,
  createEventTicketType,
  updateEventTicketType,
  softDeleteEventTicketType,
};