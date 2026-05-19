const { fetch } = require('undici');

const PAYMENT_GATEWAY_URL =
  process.env.PAYMENT_GATEWAY_URL || 'http://localhost:3003';
const PAYMENT_GATEWAY_API_KEY = process.env.PAYMENT_GATEWAY_API_KEY || '';
const PAYMENT_GATEWAY_TIMEOUT_MS =
  Number(process.env.PAYMENT_GATEWAY_TIMEOUT_MS) || 10000;

const createHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (PAYMENT_GATEWAY_API_KEY) {
    headers['X-Api-Key'] = PAYMENT_GATEWAY_API_KEY;
  }
  return headers;
};

const processPayment = async ({
  amount,
  currency = 'COP',
  pan,
  cvv,
  expiry,
  cardHolder,
  externalReference,
  description,
}) => {
  if (!amount || !pan || !cvv || !expiry || !cardHolder || !externalReference) {
    return {
      ok: false,
      error: 'Missing payment data.',
    };
  }

  const url = `${PAYMENT_GATEWAY_URL.replace(/\/+$/, '')}/api/payments/process-payment`;
  const payload = {
    amount,
    currency,
    pan,
    cvv,
    expiry,
    cardHolder,
    externalReference,
    description,
  };

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    PAYMENT_GATEWAY_TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: data?.error || 'Payment gateway returned an error.',
        details: data,
      };
    }

    return {
      ok: true,
      approved: data?.ok === true && data?.status === 'APPROVED',
      transactionId: data?.transactionId || null,
      data,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        ok: false,
        error: 'Payment gateway request timed out.',
      };
    }

    return {
      ok: false,
      error: 'Failed to contact payment gateway.',
      details: error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { processPayment };
