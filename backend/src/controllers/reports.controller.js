const prisma = require('../prisma/prisma');

const getInterestReport = async (req, res) => {
  try {
    const grouped = await prisma.interest.groupBy({
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

    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

module.exports = { getInterestReport };