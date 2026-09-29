// paypal -- PayPal Checkout for international customers.
// Docs: https://developer.paypal.com/api/rest/
//
// Buttons
//   Test PayPal (Integrations tab)       gets an access token (sandbox or live)
//   Pay with PayPal (under the QR)       POST /v2/checkout/orders -> QR of the approval page
//   Check PayPal payment (sale details)  GET the order; if approved, capture it
//   Refund PayPal payment (sale details) POST /v2/payments/captures/:id/refund
// PayPal only accepts certain currencies (not NPR); the shop's currency must be one of them.

import { toDecimalString, sale } from './_util.js';

const CURRENCIES = new Set(['AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF', 'ILS', 'JPY', 'MYR', 'MXN', 'TWD', 'NZD', 'NOK', 'PHP', 'PLN', 'GBP', 'SGD', 'SEK', 'CHF', 'THB', 'USD']);
// Test keys = PayPal sandbox app; live keys = live app.
const base = (env) => (env.STRATEK_MODE === 'test' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com');

async function token(env, store) {
  const cached = await store.get('token');
  if (cached?.access_token && cached.expiresAt > Date.now() + 60000 && cached.base === base(env) && cached.clientId === env.PAYPAL_CLIENT_ID) return cached.access_token;
  const res = await fetch(`${base(env)}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const d = await res.json().catch(() => null);
  if (!res.ok || !d?.access_token) throw new Error(`PayPal did not accept the client ID/secret${env.STRATEK_MODE === 'test' ? ' (sandbox -- use the Sandbox app credentials in Test keys)' : ' (live -- sandbox credentials go in Test keys)'}.`);
  await store.put('token', { access_token: d.access_token, expiresAt: Date.now() + (d.expires_in || 3000) * 1000, base: base(env), clientId: env.PAYPAL_CLIENT_ID });
  return d.access_token;
}

async function pp(env, store, method, path, body, requestId) {
  const headers = { Authorization: `Bearer ${await token(env, store)}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  if (requestId) headers['PayPal-Request-Id'] = requestId;
  const res = await fetch(base(env) + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`PayPal: ${data?.details?.[0]?.description || data?.message || `error ${res.status}`}`);
  return data;
}

export default {
  id: 'paypal',
  name: 'PayPal',
  category: 'payments',
  status: 'available',
  description: 'PayPal checkout for international customers.',
  docsUrl: 'https://developer.paypal.com/api/rest/',
  test: { support: 'sandbox', note: 'Use the credentials of a PayPal Sandbox app (developer.paypal.com -> Apps & Credentials -> Sandbox).' },
  secrets: [
    { name: 'PAYPAL_CLIENT_ID', label: 'PayPal client ID', hint: 'developer.paypal.com -> Apps & Credentials -> Live.' },
    { name: 'PAYPAL_CLIENT_SECRET', label: 'PayPal client secret' },
  ],
  actions: [
    {
      id: 'test', label: 'Test PayPal', placement: ['settings'], fields: [],
      async run({ env, store }) {
        await token(env, store);
        return { type: 'message', title: 'PayPal is connected', text: `Credentials accepted (${base(env).includes('sandbox') ? 'SANDBOX' : 'LIVE'}). PayPal accepts: ${[...CURRENCIES].join(', ')}.` };
      },
    },
    {
      id: 'payment_link', label: 'Pay with PayPal', placement: ['charge'], fields: [],
      async run({ env, context, origin, store, claims }) {
        const tx = sale(context);
        if (!CURRENCIES.has(tx.currency)) throw new Error(`PayPal does not accept ${tx.currency}.`);
        const value = toDecimalString(tx.amount, tx.currency);
        const o = await pp(env, store, 'POST', '/v2/checkout/orders', {
          intent: 'CAPTURE',
          purchase_units: [{ reference_id: tx.id, custom_id: tx.id, description: `${claims.owner_name || 'Shop'} -- sale #${tx.id}`.slice(0, 127), amount: { currency_code: tx.currency, value } }],
          payment_source: { paypal: { experience_context: { return_url: `${origin}/paid`, cancel_url: `${origin}/paid`, user_action: 'PAY_NOW' } } },
        }, `stratek-${claims.aud}-${tx.id}-${value}`);
        const link = (o.links || []).find((l) => l.rel === 'payer-action' || l.rel === 'approve');
        if (!link) throw new Error('PayPal did not return a payment page.');
        await store.put(`tx:${tx.id}`, { orderId: o.id, value, currency: tx.currency });
        return { type: 'qr', title: `Pay with PayPal -- ${tx.currency} ${value}`, text: 'Customer scans this to pay with PayPal. Then use "Check PayPal payment" on the sale.', qrPayload: link.href };
      },
    },
    {
      id: 'check', label: 'Check PayPal payment', placement: ['transaction'], fields: [],
      async run({ env, context, store }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved) return { type: 'message', title: 'No PayPal payment', text: 'No PayPal payment was started for this sale.' };
        let o = await pp(env, store, 'GET', `/v2/checkout/orders/${encodeURIComponent(saved.orderId)}`);
        if (o.status === 'APPROVED') o = await pp(env, store, 'POST', `/v2/checkout/orders/${encodeURIComponent(saved.orderId)}/capture`, {}, `stratek-capture-${saved.orderId}`);
        const capture = o.purchase_units?.[0]?.payments?.captures?.[0];
        if (capture?.id) await store.put(`tx:${tx.id}`, { ...saved, captureId: capture.id });
        const paid = o.status === 'COMPLETED';
        return { type: 'status', title: 'PayPal', status: paid ? 'Paid' : o.status, text: paid ? 'The customer has paid with PayPal. Now press Settle on this sale.' : 'Not paid yet.' };
      },
    },
    {
      id: 'refund', label: 'Refund PayPal payment', placement: ['transaction'],
      fields: [{ name: 'amount', label: 'Amount to refund (empty = all)', type: 'number' }],
      async run({ env, context, store, fields }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved?.captureId) throw new Error('No completed PayPal payment for this sale (press "Check PayPal payment" first).');
        const body = fields.amount ? { amount: { value: toDecimalString(fields.amount, saved.currency), currency_code: saved.currency } } : {};
        const r = await pp(env, store, 'POST', `/v2/payments/captures/${encodeURIComponent(saved.captureId)}/refund`, body, `stratek-refund-${saved.captureId}-${fields.amount || 'all'}`);
        return { type: 'status', title: 'PayPal refund', status: r.status, text: `Refund ${r.id}.` };
      },
    },
  ],
};
