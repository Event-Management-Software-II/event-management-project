const purchasesService = require('../services/purchases.service');

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
  const { id_event_ticket, quantity, pan, cvv, expiry, cardHolder } = req.body;

  if (!id_event_ticket || !quantity || quantity <= 0)
    return res
      .status(400)
      .json({ error: 'Ticket type and quantity are required' });

  try {
    const purchase = await purchasesService.createPurchase(req.userId, {
      id_event_ticket,
      quantity,
      pan,
      cvv,
      expiry,
      cardHolder,
    });
    return res.status(201).json({
      message: 'Purchase completed successfully',
      purchaseId: purchase.id_purchase,
    });
  } catch (err) {
    if (err.message === 'TICKET_TYPE_NOT_FOUND')
      return res
        .status(404)
        .json({ error: 'Ticket type not found or event is inactive' });
    if (err.message === 'NOT_ENOUGH_TICKETS')
      return res.status(409).json({
        error: `Not enough tickets available. Only ${err.available} remaining`,
      });
    if (err.message === 'PAYMENT_DATA_REQUIRED')
      return res
        .status(400)
        .json({ error: 'Card data is required for paid tickets' });
    if (err.message === 'PAYMENT_REJECTED')
      return res.status(402).json({ error: err.details || 'Payment rejected' });
    if (err.message === 'PAYMENT_GATEWAY_ERROR')
      return res
        .status(502)
        .json({ error: err.details || 'Payment gateway error' });
    console.error('Error in createPurchase:', err);
    return res.status(500).json({ error: 'Failed to process purchase' });
  }
};

module.exports = { getPurchases, createPurchase };
