// square -- card payments (and Apple Pay / Google Pay / Cash App Pay where Square offers
// them) through Square payment links, for businesses in Square's countries.
// developer.squareup.com -> Applications -> your app -> Credentials: the Production access
// token for your own account (Sandbox token under Test keys). Location: optional, else the
// first active location.
//   API: https://connect.squareup.com/v2 (test: https://connect.squareupsandbox.com/v2)
//        GET /locations, POST /online-checkout/payment-links (quick_pay), GET /orders/{id},
//        POST /refunds
// Buttons: Test Square (Integrations tab); Pay by card (Square) under the payment QR;
// Check Square payment, Refund Square payment (needs a person) on the sale.

import { sale, toMinor } from './_util.js';
import { readJson } from './_ship.js';
import { randomToken } from './_nepal.js';

const base = (mode) => (mode === 'test' ? 'https://connect.squareupsandbox.com/v2' : 'https://connect.squareup.com/v2');
const VERSION = '2025-09-24';

async function sq(env, mode, method, path, body) {
  const res = await fetch(`${base(mode)}${path}`, { method, headers: { Authorization: `Bearer ${String(env.SQUARE_ACCESS_TOKEN).trim()}`, 'Square-Version': VERSION, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 401) throw new Error('Square did not accept the access token (sandbox and production tokens are different).');
  if (!res.ok) throw new Error(`Square: ${(j?.errors || []).map((e) => e.detail || e.code).join('; ') || `error ${res.status}`}`);
  return j || {};
}

async function locationId(env, store, mode) {
  if (env.SQUARE_LOCATION_ID) return String(env.SQUARE_LOCATION_ID).trim();
  const have = await store.get(`location:${mode}`);
  if (have) return have;
  const loc = ((await sq(env, mode, 'GET', '/locations')).locations || []).find((l) => l.status === 'ACTIVE');
  if (!loc) throw new Error('Square: no active location on this account.');
  await store.put(`location:${mode}`, loc.id);
  return loc.id;
}

async function checkOrder(env, mode, orderId) {
  const o = (await sq(env, mode, 'GET', `/orders/${encodeURIComponent(orderId)}`)).order || {};
  const tender = (o.tenders || []).find((t) => t.payment_id) || (o.tenders || [])[0];
  const due = o.net_amount_due_money?.amount;
  return { paid: !!tender && (due === undefined || Number(due) === 0) && o.state !== 'CANCELED', paymentId: tender?.payment_id || tender?.id, amount: Number(o.total_money?.amount || 0), state: o.state };
}

export default {
  id: 'square',
  name: 'Square',
  category: 'payments',
  status: 'available',
  color: '#006AFF',
  description: 'Card payments through Square payment links (for businesses in Square\'s countries).',
  docsUrl: 'https://developer.squareup.com/docs/checkout-api/quick-pay-checkout',
  test: { support: 'sandbox', note: 'Save your Sandbox access token under Test keys; pay with Square\'s sandbox test cards.' },
  secrets: [
    { name: 'SQUARE_ACCESS_TOKEN', label: 'Square access token', hint: 'developer.squareup.com -> Applications -> your app -> Credentials -> Production access token.' },
    { name: 'SQUARE_LOCATION_ID', label: 'Location ID', hint: 'Optional: which Square location takes the payments (default: the first active one).', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test Square', placement: ['settings'], fields: [],
      async run({ env, mode }) {
        const locs = ((await sq(env, mode, 'GET', '/locations')).locations || []).filter((l) => l.status === 'ACTIVE');
        return { type: 'message', title: 'Square is connected', text: `${locs.length} active location${locs.length === 1 ? '' : 's'}${locs[0] ? `: ${locs.slice(0, 3).map((l) => `${l.name} (${l.currency})`).join(', ')}` : ''}${mode === 'test' ? ' -- sandbox' : ''}.` };
      },
    },
    {
      id: 'payment_link', label: 'Pay by card (Square)', placement: ['charge'], fields: [],
      async run({ env, context, store, mode, claims }) {
        const tx = sale(context);
        const amount = toMinor(tx.amount, tx.currency);
        const saved = await store.get(`tx:${tx.id}`);
        if (saved?.url && saved.amount === amount && !saved.paid) return { type: 'qr', title: `Pay ${tx.currency} ${tx.amount} by card`, text: 'Customer scans this to pay by card. Then use "Check Square payment" on the sale.', qrPayload: saved.url };
        const r = await sq(env, mode, 'POST', '/online-checkout/payment-links', { idempotency_key: `stratek-${tx.id}-${amount}-${randomToken(4)}`, description: `Stratek sale #${tx.id}`, quick_pay: { name: `${claims?.owner_name || 'Shop'} -- sale #${tx.id}`.slice(0, 255), price_money: { amount, currency: tx.currency }, location_id: await locationId(env, store, mode) }, payment_note: `Stratek sale #${tx.id}` });
        const link = r.payment_link || {};
        await store.put(`tx:${tx.id}`, { url: link.url, orderId: link.order_id, linkId: link.id, amount, currency: tx.currency });
        return { type: 'qr', title: `Pay ${tx.currency} ${tx.amount} by card`, text: `Customer scans this to pay by card${mode === 'test' ? ' (SANDBOX)' : ''}. Then use "Check Square payment" on the sale.`, qrPayload: link.url };
      },
    },
    {
      id: 'check', label: 'Check Square payment', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode, emit }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved?.orderId) return { type: 'message', title: 'No Square payment', text: 'No Square payment was started for this sale.' };
        const c = await checkOrder(env, mode, saved.orderId);
        if (!c.paid) return { type: 'status', title: 'Square', status: 'Waiting', text: 'Not paid yet.' };
        if (!saved.reported) await emit({ id: `square-${c.paymentId || saved.orderId}`, type: 'payment.succeeded', data: { transactionId: String(tx.id), amount: (c.amount || saved.amount) / toMinor(1, saved.currency || tx.currency), currency: saved.currency || tx.currency, provider: 'Square', integration: 'square', providerRef: String(c.paymentId || saved.orderId), method: 'card', livemode: mode !== 'test' } });
        await store.put(`tx:${tx.id}`, { ...saved, paid: true, reported: true, paymentId: c.paymentId });
        return { type: 'status', title: 'Square', status: 'Paid', text: 'The customer has paid by card. Now press Settle on this sale.' };
      },
    },
    {
      id: 'refund', outbound: true, label: 'Refund Square payment', placement: ['transaction'], fields: [{ name: 'amount', label: 'Amount to refund (empty = all)', type: 'number' }],
      async run({ env, context, store, fields, mode }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved?.paid || !saved.paymentId) throw new Error('This sale has no paid Square payment. Press "Check Square payment" first.');
        const amount = fields.amount ? toMinor(fields.amount, saved.currency) : saved.amount;
        if (amount > saved.amount) throw new Error('Refund amount is more than was paid.');
        const r = await sq(env, mode, 'POST', '/refunds', { idempotency_key: `stratek-refund-${saved.paymentId}-${amount}`, payment_id: saved.paymentId, amount_money: { amount, currency: saved.currency }, reason: `Stratek sale #${tx.id}` });
        return { type: 'status', title: 'Square refund', status: r.refund?.status || 'PENDING', text: `Refund ${r.refund?.id || ''}.` };
      },
    },
  ],
};
