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
    const grouped = await prisma.interest.groupBy({
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
        // ✅ CORREGIDO: seleccionar categoryName en lugar de nameCategory
        category: { select: { categoryName: true } },
      },
    });

    const eventMap = Object.fromEntries(events.map(e => [e.id_event, e]));

    const report = grouped.map(g => {
      const event = eventMap[g.id_event];
      return {
        id_event:        g.id_event,
        // ✅ CORREGIDO: eventName en lugar de NameEvent
        eventName:       event?.eventName ?? null,
        // ✅ CORREGIDO: categoryName en lugar de nameCategory
        categoryName:    event?.category?.categoryName ?? null,
        location:        event?.location ?? null,
        date_time:       event?.date_time ?? null,
        total_interests: g._count.id_event,
      };
    });

    repCache.set(CACHE_KEYS.interest, report);
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

module.exports = { getInterestReport };