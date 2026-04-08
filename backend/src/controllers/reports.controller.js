const prisma = require('../prisma/prisma');

const getInterestReport = async (req, res) => {
  try {
    const grouped = await prisma.userEvent.groupBy({
      by: ['id_event'],
      _count: { id_event: true },
      orderBy: { _count: { id_event: 'desc' } },
    });

    if (grouped.length === 0) return res.json([]);

    const events = await prisma.event.findMany({
      where: {
        id_event: { in: grouped.map(g => g.id_event) },
      },
      include: {
        category: { select: { categoryName: true } },
      },
    });

    const eventMap = Object.fromEntries(events.map(e => [e.id_event, e]));

    const report = grouped.map(g => {
      const event = eventMap[g.id_event];
      return {
        'Event Name':          event?.eventName ?? null,
        'Number of Interests': g._count.id_event,
      };
    });

    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

const getSalesReport = async (req, res) => {
  try {
    // Obtener todos los eventos activos con sus tipos de tickets
    const events = await prisma.event.findMany({
      where: { deleted_at: null },
      include: {
        category: { select: { categoryName: true } },
        ticketTypes: {
          where: { deleted_at: null },
          include: {
            catalog: { select: { typeName: true } },
            purchases: {
              where: { status: 'completed' },
              select: { quantity: true, total_price: true },
            },
          },
        },
      },
      orderBy: { id_event: 'asc' },
    });

    // Construir reporte fila por fila (evento + tipo de ticket)
    const report = [];

    for (const event of events) {
      for (const ett of event.ticketTypes) {
        const ticketsSold = ett.purchases.reduce((sum, p) => sum + p.quantity, 0);
        const revenue = ett.purchases.reduce((sum, p) => sum + (p.total_price || 0), 0);

        report.push({
          id_event: event.id_event,
          event_name: event.eventName,
          category_name: event.category.categoryName,
          ticket_type_name: ett.catalog.typeName,
          capacity: ett.capacity,
          tickets_sold: ticketsSold,
          tickets_remaining: ett.capacity - ticketsSold,
          revenue: revenue,
        });
      }
    }

    // Ordenar por evento, luego por tickets vendidos desc
    report.sort((a, b) => {
      if (a.id_event !== b.id_event) return a.id_event - b.id_event;
      return b.tickets_sold - a.tickets_sold;
    });

    res.json({ ok: true, data: report });
  } catch (err) {
    console.error('Error fetching sales report:', err);
    res.status(500).json({ error: 'Failed to fetch sales report' });
  }
};

module.exports = { getInterestReport, getSalesReport };