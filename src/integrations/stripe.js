// stripe -- card payments (and Apple Pay / Google Pay) through Stripe Checkout.
// Docs: https://docs.stripe.com/api
//
// Buttons
//   Test Stripe (Integrations tab)         GET /v1/account
//   Pay by card (under the payment QR)     POST /v1/checkout/sessions -> QR of the checkout page
//   Check card payment (sale details)      GET /v1/checkout/sessions/:id
//   Refund card payment (sale details)     POST /v1/refunds
// After "Paid", press Settle in Stratek (automatic confirmation comes with signed events).

import { toMinor, sale } from './_util.js';

const API = 'https://api.stripe.com/v1';

/** Stripe wants form-encoded bodies with bracket keys. */
function form(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') form(v, key, out); else out.append(key, String(v));
  }
  return out;
}

async function stripe(env, method, path, body, idem) {
  const headers = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (idem) headers['Idempotency-Key'] = idem;
  const res = await fetch(API + path, { method, headers, body: body ? form(body).toString() : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Stripe did not accept the secret key. Check it in Set up.');
    throw new Error(`Stripe: ${data?.error?.message || `error ${res.status}`}`);
  }
  return data;
}

export default {
  id: 'stripe',
  name: 'Stripe',
  category: 'payments',
  status: 'available',
  description: 'Card payments and payment links (international cards, Apple Pay, Google Pay).',
  docsUrl: 'https://docs.stripe.com/api',
  secrets: [
    { name: 'STRIPE_SECRET_KEY', label: 'Stripe secret key', hint: 'Stripe Dashboard -> Developers -> API keys. Starts with sk_live_. A restricted key (rk_live_) with Checkout Sessions + Refunds write access also works.' },
  ],
  test: { support: 'sandbox', hints: { STRIPE_SECRET_KEY: 'Test-mode key from the same page (starts with sk_test_ or rk_test_). Pay with Stripe test cards, e.g. 4242 4242 4242 4242.' } },
  actions: [
    {
      id: 'test', label: 'Test Stripe', placement: ['settings'], fields: [],
      async run({ env }) {
        const a = await stripe(env, 'GET', '/account');
        const mode = String(env.STRIPE_SECRET_KEY).includes('_test_') ? 'TEST' : 'LIVE';
        return { type: 'message', title: 'Stripe is connected', text: `${a.business_profile?.name || a.settings?.dashboard?.display_name || a.id} (${a.country || '?'}, default currency ${String(a.default_currency || '?').toUpperCase()}), ${mode} mode.` };
      },
    },
    {
      id: 'payment_link', label: 'Pay by card (Stripe)', placement: ['charge'], fields: [],
      async run({ env, context, origin, store, claims }) {
        const tx = sale(context);
        const amount = toMinor(tx.amount, tx.currency);
        const s = await stripe(env, 'POST', '/checkout/sessions', {
          mode: 'payment',
          success_url: `${origin}/paid`,
          cancel_url: `${origin}/paid`,
          client_reference_id: tx.id,
          line_items: { 0: { quantity: 1, price_data: { currency: tx.currency.toLowerCase(), unit_amount: amount, product_data: { name: `${claims.owner_name || 'Shop'} -- sale #${tx.id}`.slice(0, 250) } } } },
          metadata: { stratek_transaction: tx.id, reference: tx.reference || '' },
        }, `stratek-${claims.aud}-${tx.id}-${amount}-${tx.currency}`);
        await store.put(`tx:${tx.id}`, { sessionId: s.id, amount, currency: tx.currency });
        return { type: 'qr', title: `Pay by card -- ${tx.currency} ${tx.amount}`, text: `Customer scans this to pay by card${s.livemode === false ? ' (TEST mode)' : ''}. Then use "Check card payment" on the sale.`, qrPayload: s.url };
      },
    },
    {
      id: 'check', label: 'Check card payment', placement: ['transaction'], fields: [],
      async run({ env, context, store }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved) return { type: 'message', title: 'No card payment', text: 'No Stripe payment was started for this sale.' };
        const s = await stripe(env, 'GET', `/checkout/sessions/${encodeURIComponent(saved.sessionId)}`);
        if (s.payment_intent) await store.put(`tx:${tx.id}`, { ...saved, paymentIntent: s.payment_intent });
        const paid = s.payment_status === 'paid';
        return { type: 'status', title: 'Stripe', status: paid ? 'Paid' : s.status === 'expired' ? 'Expired' : 'Waiting', text: paid ? 'The customer has paid by card. Now press Settle on this sale.' : 'Not paid yet.' };
      },
    },
    {
      id: 'refund', outbound: true, label: 'Refund card payment', placement: ['transaction'],
      fields: [{ name: 'amount', label: 'Amount to refund (empty = all)', type: 'number' }],
      async run({ env, context, store, fields }) {
        const tx = sale(context);
        let saved = await store.get(`tx:${tx.id}`);
        if (!saved) throw new Error('No Stripe payment was started for this sale.');
        if (!saved.paymentIntent) {
          const s = await stripe(env, 'GET', `/checkout/sessions/${encodeURIComponent(saved.sessionId)}`);
          if (s.payment_status !== 'paid' || !s.payment_intent) throw new Error('This sale has not been paid by card, so there is nothing to refund.');
          saved = { ...saved, paymentIntent: s.payment_intent };
          await store.put(`tx:${tx.id}`, saved);
        }
        const amount = fields.amount ? toMinor(fields.amount, saved.currency) : undefined;
        if (amount !== undefined && amount > saved.amount) throw new Error('Refund amount is more than was paid.');
        const r = await stripe(env, 'POST', '/refunds', { payment_intent: saved.paymentIntent, amount }, `stratek-refund-${saved.paymentIntent}-${amount || 'all'}`);
        return { type: 'status', title: 'Stripe refund', status: r.status, text: `Refund ${r.id}.` };
      },
    },
  ],
};
