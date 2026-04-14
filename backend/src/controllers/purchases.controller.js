const purchasesService = require('./purchases.service');

// GET /api/purchases
const getPurchases = async (req, res) => {
  try {
    const data = await purchasesService.getPurchasesByUser(req.userId);
    return res.json({ ok: true, data });
  } catch (err) {
    console.error('Error in getPurchases:', err);
    return res.status(500).json({ error: 'Failed to fetch purchases' });
  }
};

// POST /api/purchases
const createPurchase = async (req, res) => {
  const { id_event_ticket, quantity } = req.body;

  if (!id_event_ticket || !quantity || quantity <= 0)
    return res.status(400).json({ error: 'Ticket type and quantity are required' });

  try {
    const purchase = await purchasesService.createPurchase(req.userId, { id_event_ticket, quantity });
    return res.status(201).json({
      message:    'Purchase completed successfully',
      purchaseId: purchase.id_purchase,
    });
  } catch (err) {
    if (err.message === 'TICKET_TYPE_NOT_FOUND')
      return res.status(404).json({ error: 'Ticket type not found or event is inactive' });
    if (err.message === 'NOT_ENOUGH_TICKETS')
      return res.status(409).json({ error: `Not enough tickets available. Only ${err.available} remaining` });
    console.error('Error in createPurchase:', err);
    return res.status(500).json({ error: 'Failed to process purchase' });
  }
};

module.exports = { getPurchases, createPurchase };