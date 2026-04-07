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
        event: {
          include: {
            category: true,
            images: { where: { type: 'poster' }, take: 1 },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const data = purchases.map(p => ({
      idPurchase: p.id_purchase,
      idEvent:    p.id_event,
      name:       p.event.eventName,
      category:   p.event.category.categoryName,
      location:   p.event.location,
      dateTime:   p.event.date_time,
      imageUrl:   p.event.images[0]?.image_url ?? null,
      quantity:   p.quantity,
      unitPrice:  p.unit_price,
      totalPrice: p.total_price ?? p.quantity * p.unit_price,
      status:     p.status,
      createdAt:  p.created_at,
    }));

    purchaseCache.set(cacheKey, data);
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('Error in getPurchases:', err);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
};

module.exports = { getPurchases };