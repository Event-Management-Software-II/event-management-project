const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');

const repCache = new NodeCache({ stdTTL: 300 });

const CACHE_KEYS = {
  interest: 'reports:interest',
};

const invalidateRepCache = () => {
  repCache.del(CACHE_KEYS.interest);
};

const getInterestReport = async (req, res) => {
  const cached = repCache.get(CACHE_KEYS.interest);
  if (cached) return res.json(cached);

  try {
    const grouped = await prisma.userEvent.groupBy({
      by: ['id_event'],
      _count: { id_event: true },
      orderBy: { _count: { id_event: 'desc' } },
    });

    if (grouped.length === 0) {
      const report = [];
      repCache.set(CACHE_KEYS.interest, report);
      return res.json(report);
    }

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

    repCache.set(CACHE_KEYS.interest, report);
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

const getSalesReport = async (req, res) => {
  try {
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

    const report = [];

    for (const event of events) {
      for (const ett of event.ticketTypes) {
        const ticketsSold = ett.purchases.reduce((sum, p) => sum + p.quantity, 0);
        const revenue     = ett.purchases.reduce((sum, p) => sum + (p.total_price || 0), 0);

        report.push({
          id_event:         event.id_event,
          event_name:       event.eventName,
          category_name:    event.category.categoryName,
          ticket_type_name: ett.catalog.typeName,
          capacity:         ett.capacity,
          tickets_sold:     ticketsSold,
          tickets_remaining: ett.capacity - ticketsSold,
          revenue,
        });
      }
    }

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

const getAdminHomeStats = async (req, res) => {
  try {
    const [totalRevenue, activeEvents, completedEvents, registeredUsers] = await Promise.all([
      prisma.purchase.aggregate({
        where: { status: 'completed' },
        _sum: { total_price: true },
      }),
      prisma.event.count({
        where: { deleted_at: null, date_time: { gt: new Date() } },
      }),
      prisma.event.count({
        where: {
          deleted_at: null,
          date_time: { lte: new Date(Date.now() - 86_400_000) },
        },
      }),
      prisma.user.count({
        where: {
          deleted_at: null,
          role: { roleName: { not: 'admin' } },
        },
      }),
    ]);

    res.json({
      ok: true,
      data: {
        total_revenue:    totalRevenue._sum.total_price ?? 0,
        active_events:    activeEvents,
        completed_events: completedEvents,
        registered_users: registeredUsers,
      },
    });
  } catch (err) {
    console.error('Error fetching admin home stats:', err);
    res.status(500).json({ error: 'Failed to fetch admin home stats' });
  }
};

module.exports = { getInterestReport, getSalesReport, getAdminHomeStats };