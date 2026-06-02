const prisma = require('../prisma/prisma');
const NodeCache = require('node-cache');

const repCache = new NodeCache({ stdTTL: 300 });

const CACHE_KEYS = {
  interest: 'reports:interest',
  sales: 'reports:sales',
  salesByEvent: 'reports:salesByEvent',
  stats: 'reports:stats',
  favorites: 'reports:favorites',
};

const invalidateReportsCache = () => repCache.flushAll();

// ── Interest report ───────────────────────────────────────────────────────────

const getInterestReport = async () => {
  const cached = repCache.get(CACHE_KEYS.interest);
  if (cached) return cached;

  const grouped = await prisma.userEvent.groupBy({
    by: ['id_event'],
    _count: { id_event: true },
    orderBy: { _count: { id_event: 'desc' } },
  });

  if (grouped.length === 0) {
    repCache.set(CACHE_KEYS.interest, []);
    return [];
  }

  const events = await prisma.event.findMany({
    where: { id_event: { in: grouped.map((g) => g.id_event) } },
    include: { category: { select: { categoryName: true } } },
  });

  const eventMap = Object.fromEntries(events.map((e) => [e.id_event, e]));

  const report = grouped.map((g) => ({
    'Event Name': eventMap[g.id_event]?.eventName ?? null,
    'Number of Interests': g._count.id_event,
  }));

  repCache.set(CACHE_KEYS.interest, report);
  return report;
};

// ── Sales report (flat, legacy) ───────────────────────────────────────────────

const getSalesReport = async () => {
  const cached = repCache.get(CACHE_KEYS.sales);
  if (cached) return cached;

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
      const revenue = ett.purchases.reduce(
        (sum, p) => sum + (p.total_price || 0),
        0
      );

      report.push({
        id_event: event.id_event,
        event_name: event.eventName,
        category_name: event.category.categoryName,
        ticket_type_name: ett.catalog.typeName,
        capacity: ett.capacity,
        tickets_sold: ticketsSold,
        tickets_remaining: ett.capacity - ticketsSold,
        revenue,
      });
    }
  }

  report.sort((a, b) =>
    a.id_event !== b.id_event
      ? a.id_event - b.id_event
      : b.tickets_sold - a.tickets_sold
  );

  repCache.set(CACHE_KEYS.sales, report);
  return report;
};

// ── Sales report grouped BY EVENT (nuevo) ─────────────────────────────────────
// Devuelve un array de eventos, cada uno con su total de ventas y el detalle
// de tipos de entrada como array anidado. El frontend renderiza un acordeón.

const getSalesReportByEvent = async () => {
  const cached = repCache.get(CACHE_KEYS.salesByEvent);
  if (cached) return cached;

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

  const report = events.map((event) => {
    const ticketDetail = event.ticketTypes.map((ett) => {
      const ticketsSold = ett.purchases.reduce((s, p) => s + p.quantity, 0);
      const revenue = ett.purchases.reduce(
        (s, p) => s + (p.total_price || 0),
        0
      );
      return {
        id_event_ticket: ett.id_event_ticket,
        ticket_type_name: ett.catalog.typeName,
        capacity: ett.capacity,
        tickets_sold: ticketsSold,
        tickets_remaining: ett.capacity - ticketsSold,
        revenue,
      };
    });

    const totalSold = ticketDetail.reduce((s, t) => s + t.tickets_sold, 0);
    const totalRevenue = ticketDetail.reduce((s, t) => s + t.revenue, 0);

    return {
      id_event: event.id_event,
      event_name: event.eventName,
      category_name: event.category.categoryName,
      total_sold: totalSold,
      total_revenue: totalRevenue,
      ticket_types: ticketDetail,
    };
  });

  // ordenar por total vendido desc
  report.sort((a, b) => b.total_sold - a.total_sold);

  repCache.set(CACHE_KEYS.salesByEvent, report);
  return report;
};

// ── Favorites report ──────────────────────────────────────────────────────────

const getFavoritesReport = async () => {
  const cached = repCache.get(CACHE_KEYS.favorites);
  if (cached) return cached;

  const grouped = await prisma.userEvent.groupBy({
    by: ['id_event'],
    _count: { id_event: true },
    orderBy: { _count: { id_event: 'desc' } },
  });

  if (grouped.length === 0) {
    repCache.set(CACHE_KEYS.favorites, []);
    return [];
  }

  const events = await prisma.event.findMany({
    where: {
      id_event: { in: grouped.map((g) => g.id_event) },
      deleted_at: null,
    },
    select: { id_event: true, eventName: true },
  });

  const eventMap = Object.fromEntries(events.map((e) => [e.id_event, e]));

  const report = grouped
    .filter((g) => eventMap[g.id_event])
    .map((g) => ({
      event_name: eventMap[g.id_event].eventName,
      total_favorites: g._count.id_event,
    }));

  repCache.set(CACHE_KEYS.favorites, report);
  return report;
};

// ── Admin home stats ──────────────────────────────────────────────────────────

const getAdminHomeStats = async () => {
  const cached = repCache.get(CACHE_KEYS.stats);
  if (cached) return cached;

  const now = new Date();
  const completedThreshold = new Date(now.getTime() - 86_400_000);

  const activeFilter = { deleted_at: null, date_time: { gt: now } };
  const completedFilter = {
    deleted_at: null,
    date_time: { lte: completedThreshold },
  };

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    totalRevenue,
    activeEventsList,
    completedEventsList,
    registeredUsers,
    activeEventsDetail,
    monthlyPurchases,
  ] = await Promise.all([
    prisma.purchase.aggregate({
      where: { status: 'completed' },
      _sum: { total_price: true },
    }),
    prisma.event.findMany({
      where: activeFilter,
      select: { id_event: true, eventName: true },
      orderBy: { date_time: 'asc' },
    }),
    prisma.event.findMany({
      where: completedFilter,
      select: { id_event: true, eventName: true, date_time: true },
      orderBy: { date_time: 'desc' },
    }),
    prisma.user.count({
      where: { deleted_at: null, role: { roleName: { not: 'admin' } } },
    }),
    prisma.event.findMany({
      where: activeFilter,
      select: {
        id_event: true,
        eventName: true,
        date_time: true,
        ticketTypes: {
          where: { deleted_at: null },
          select: {
            capacity: true,
            purchases: {
              where: { status: 'completed' },
              select: { quantity: true },
            },
          },
        },
      },
      orderBy: { date_time: 'asc' },
    }),
    prisma.purchase.findMany({
      where: {
        status: 'completed',
        created_at: { gte: sixMonthsAgo },
      },
      select: { total_price: true, created_at: true },
    }),
  ]);

  const active_events_detail = activeEventsDetail.map((e) => {
    const capacity = e.ticketTypes.reduce((s, tt) => s + tt.capacity, 0);
    const ticketsSold = e.ticketTypes.reduce(
      (s, tt) => s + tt.purchases.reduce((sp, p) => sp + p.quantity, 0),
      0
    );
    return {
      id_event: e.id_event,
      eventName: e.eventName,
      date_time: e.date_time,
      tickets_sold: ticketsSold,
      capacity,
      progress: capacity > 0 ? Math.round((ticketsSold / capacity) * 100) : 0,
    };
  });

  const MONTH_NAMES = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ];
  const monthMap = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = {
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      revenue: 0,
    };
  }
  for (const p of monthlyPurchases) {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthMap[key]) monthMap[key].revenue += p.total_price ?? 0;
  }
  const monthly_revenue = Object.values(monthMap);

  const stats = {
    total_revenue: totalRevenue._sum.total_price ?? 0,
    active_events: {
      count: activeEventsList.length,
      items: activeEventsList,
    },
    completed_events: {
      count: completedEventsList.length,
      items: completedEventsList,
    },
    registered_users: registeredUsers,
    active_events_detail,
    monthly_revenue,
  };

  repCache.set(CACHE_KEYS.stats, stats);
  return stats;
};

module.exports = {
  getInterestReport,
  getSalesReport,
  getSalesReportByEvent,
  getFavoritesReport,
  getAdminHomeStats,
  invalidateReportsCache,
};
