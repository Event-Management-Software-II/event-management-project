const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');

const repCache = new NodeCache({ stdTTL: 300 });

const CACHE_KEYS = {
  interest: 'reports:interest',
  sales:    'reports:sales',
  stats:    'reports:stats',
};

const invalidateReportsCache = () => repCache.flushAll();

// ── Interest report ───────────────────────────────────────────────────────────

const getInterestReport = async () => {
  const cached = repCache.get(CACHE_KEYS.interest);
  if (cached) return cached;

  const grouped = await prisma.userEvent.groupBy({
    by:      ['id_event'],
    _count:  { id_event: true },
    orderBy: { _count: { id_event: 'desc' } },
  });

  if (grouped.length === 0) {
    repCache.set(CACHE_KEYS.interest, []);
    return [];
  }

  const events = await prisma.event.findMany({
    where:   { id_event: { in: grouped.map((g) => g.id_event) } },
    include: { category: { select: { categoryName: true } } },
  });

  const eventMap = Object.fromEntries(events.map((e) => [e.id_event, e]));

  const report = grouped.map((g) => ({
    'Event Name':          eventMap[g.id_event]?.eventName ?? null,
    'Number of Interests': g._count.id_event,
  }));

  repCache.set(CACHE_KEYS.interest, report);
  return report;
};

// ── Sales report ──────────────────────────────────────────────────────────────

const getSalesReport = async () => {
  const cached = repCache.get(CACHE_KEYS.sales);
  if (cached) return cached;

  const events = await prisma.event.findMany({
    where:   { deleted_at: null },
    include: {
      category:    { select: { categoryName: true } },
      ticketTypes: {
        where:   { deleted_at: null },
        include: {
          catalog:   { select: { typeName: true } },
          purchases: { where: { status: 'completed' }, select: { quantity: true, total_price: true } },
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
        id_event:          event.id_event,
        event_name:        event.eventName,
        category_name:     event.category.categoryName,
        ticket_type_name:  ett.catalog.typeName,
        capacity:          ett.capacity,
        tickets_sold:      ticketsSold,
        tickets_remaining: ett.capacity - ticketsSold,
        revenue,
      });
    }
  }

  report.sort((a, b) =>
    a.id_event !== b.id_event
      ? a.id_event - b.id_event
      : b.tickets_sold - a.tickets_sold,
  );

  repCache.set(CACHE_KEYS.sales, report);
  return report;
};

// ── Admin home stats ──────────────────────────────────────────────────────────

const getAdminHomeStats = async () => {
  const cached = repCache.get(CACHE_KEYS.stats);
  if (cached) return cached;

  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);

  const [totalRevenue, activeEvents, completedEvents, registeredUsers] = await Promise.all([
    prisma.purchase.aggregate({
      where: { status: 'completed' },
      _sum:  { total_price: true },
    }),
    prisma.event.count({
      where: { deleted_at: null, date_time: { gt: now } },
    }),
    prisma.event.count({
      where: { deleted_at: null, date_time: { lte: yesterday } },
    }),
    prisma.user.count({
      where: { deleted_at: null, role: { roleName: { not: 'admin' } } },
    }),
  ]);

  const stats = {
    total_revenue:    totalRevenue._sum.total_price ?? 0,
    active_events:    activeEvents,
    completed_events: completedEvents,
    registered_users: registeredUsers,
  };

  repCache.set(CACHE_KEYS.stats, stats);
  return stats;
};

module.exports = {
  getInterestReport,
  getSalesReport,
  getAdminHomeStats,
  invalidateReportsCache,
};