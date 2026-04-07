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
        // ✅ CORREGIDO: seleccionar categoryName en lugar de nameCategory
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

module.exports = { getInterestReport };