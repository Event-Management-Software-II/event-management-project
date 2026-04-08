const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');
const purchaseCache = new NodeCache({ stdTTL: 60 });

// GET /api/purchases — compras del usuario autenticado
const getPurchases = async (req, res) => {
  const id_user = req.userId;
  const cacheKey = `purchases:${id_user}`;

  const cached = purchaseCache.get(cacheKey);
  if (cached) return res.status(200).json({ ok: true, data: cached });

  try {
    const purchases = await prisma.purchase.findMany({
      where: {
        id_user: Number(id_user),
        user:  { deleted_at: null },
        event: { deleted_at: null },
      },
      include: {
        // NUEVO: Incluir el tipo de ticket específico con su catálogo y evento
        eventTicketType: {
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
        // NUEVO: Incluir tickets individuales generados
        tickets: {
          select: {
            id_ticket: true,
            ticket_number: true,
            qr_code: true,
            created_at: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
    });

    const data = purchases.map(p => ({
      idPurchase:   p.id_purchase,
      idEvent:      p.eventTicketType.event.id_event,
      eventName:    p.eventTicketType.event.eventName,
      category:     p.eventTicketType.event.category.categoryName,
      location:     p.eventTicketType.event.location,
      dateTime:     p.eventTicketType.event.date_time,
      imageUrl:     p.eventTicketType.event.images[0]?.image_url ?? null,
      // NUEVO: Información del tipo de ticket
      ticketType:   p.eventTicketType.catalog.typeName,
      idEventTicket: p.id_event_ticket,
      quantity:     p.quantity,
      unitPrice:    p.unit_price,
      totalPrice:   p.total_price ?? p.quantity * p.unit_price,
      status:       p.status,
      qrCode:       p.qr_code, // QR de la compra completa
      createdAt:    p.created_at,
      // NUEVO: Tickets individuales
      tickets:      p.tickets.map(t => ({
        idTicket:     t.id_ticket,
        ticketNumber: t.ticket_number,
        qrCode:       t.qr_code,
        createdAt:    t.created_at
      }))
    }));

    purchaseCache.set(cacheKey, data);
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('Error in getPurchases:', err);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
};

// POST /api/purchases — crear nueva compra
const createPurchase = async (req, res) => {
  const { id_event_ticket, quantity } = req.body;
  const id_user = req.userId;

  if (!id_event_ticket || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Ticket type and quantity are required' });
  }

  try {
    const purchase = await prisma.$transaction(async (tx) => {
      // 1. Verificar que el tipo de ticket existe y tiene capacidad
      const eventTicketType = await tx.eventTicketType.findFirst({
        where: {
          id_event_ticket: Number(id_event_ticket),
          deleted_at: null,
          event: { deleted_at: null, date_time: { gt: new Date() } }
        },
        include: { event: true, catalog: true }
      });

      if (!eventTicketType) {
        throw new Error('Ticket type not found or event is inactive');
      }

      // 2. Calcular tickets ya vendidos para este tipo
      const soldAgg = await tx.purchase.aggregate({
        where: {
          id_event_ticket: Number(id_event_ticket),
          status: 'completed'
        },
        _sum: { quantity: true }
      });
      
      const sold = soldAgg._sum.quantity || 0;
      const available = eventTicketType.capacity - sold;

      if (quantity > available) {
        throw new Error(`Not enough tickets available. Only ${available} remaining`);
      }

      // 3. Crear la compra (el total_price se calcula en la DB)
      const newPurchase = await tx.purchase.create({
        data: {
          id_user: Number(id_user),
          id_event: eventTicketType.id_event,
          id_event_ticket: Number(id_event_ticket),
          quantity: Number(quantity),
          unit_price: eventTicketType.price,
          status: 'completed', // Cambiar a 'pending' si hay pasarela de pagos
          // qr_code: null // Generar después si es necesario
        }
      });

      // 4. Generar tickets individuales (opcional, según tu flujo)
      const tickets = [];
      for (let i = 0; i < quantity; i++) {
        const ticketNumber = `${eventTicketType.event.eventName.substring(0, 3).toUpperCase()}${String(eventTicketType.id_event_ticket).padStart(3, '0')}-${Date.now().toString(36).substr(-4)}${i}`;
        // Aquí generarías el QR real
        const qrCode = `QR-${ticketNumber}`; 
        
        tickets.push({
          id_purchase: newPurchase.id_purchase,
          ticket_number: ticketNumber,
          qr_code: qrCode
        });
      }

      if (tickets.length > 0) {
        await tx.ticket.createMany({ data: tickets });
      }

      return newPurchase;
    });

    // Invalidar cache
    purchaseCache.del(`purchases:${id_user}`);

    res.status(201).json({ 
      message: 'Purchase completed successfully', 
      purchaseId: purchase.id_purchase 
    });
  } catch (err) {
    console.error('Error in createPurchase:', err);
    if (err.message.includes('Not enough tickets')) {
      return res.status(409).json({ error: err.message });
    }
    if (err.message.includes('Ticket type not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to process purchase' });
  }
};

module.exports = { getPurchases, createPurchase };