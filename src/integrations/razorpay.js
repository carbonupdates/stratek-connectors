// razorpay -- UPI, cards, netbanking and wallets for INR shops through Razorpay Payment Links.
// Razorpay Dashboard -> Account & Settings -> API keys -> generate a key (rzp_live_... / rzp_test_...).
// Optional but recommended: Dashboard -> Webhooks -> add the callback URL shown on the Set up
// page, event payment_link.paid, with a secret -- then the sale is marked "Paid online" by itself.
//   API: https://api.razorpay.com/v1 (basic auth key_id:key_secret)
//        POST /payment_links, GET /payment_links/{id}, POST /payments/{id}/refund
//   Webhooks: X-Razorpay-Signature = hex HMAC-SHA256(webhook secret, raw body)
// Buttons: Test Razorpay (Integrations tab); Pay with UPI / card (Razorpay) under the payment QR;
// Check Razorpay payment, Refund Razorpay payment (needs a person) on the sale.
// A paid link only marks the sale "Paid online" -- a person still presses Settle.

import { sale, toMinor } from './_util.js';
import { readJson } from './_ship.js';

const API = 'https://api.razorpay.com/v1';

async function rz(env, method, path, body) {
  const res = await fetch(`${API}${path}`, { method, headers: { Authorization: `Basic ${btoa(`${String(env.RAZORPAY_KEY_ID).trim()}:${String(env.RAZORPAY_KEY_SECRET).trim()}`)}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 401) throw new Error('Razorpay did not accept the key ID / secret.');
  if (!res.ok) throw new Error(`Razorpay: ${j?.error?.description || `error ${res.status}`}`);
  return j;
}

async function hmacHex(secret, text) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const inrOnly = (tx) => { if (tx.currency !== 'INR') throw new Error('Razorpay only takes payments in INR.'); };

/** Tell Stratek once, after Razorpay says the link is paid. */
async function report({ emit, store, txId, link, mode }) {
  const saved = (await store.get(`tx:${txId}`)) || {};
  const pay = (link.payments || []).find((p) => p.status === 'captured') || (link.payments || [])[0] || {};
  const next = { ...saved, status: 'paid', paymentId: pay.payment_id || pay.id || saved.paymentId, paidPaise: Number(link.amount_paid || link.amount) };
  if (!saved.reported) {
    await emit({ id: `razorpay-${link.id}`, type: 'payment.succeeded', data: { transactionId: String(txId), amount: next.paidPaise / 100, currency: 'INR', provider: 'Razorpay', integration: 'razorpay', providerRef: String(next.paymentId || link.id), method: pay.method || 'razorpay', livemode: mode !== 'test' } });
    next.reported = true;
  }
  await store.put(`tx:${txId}`, next);
  return next;
}

export default {
  id: 'razorpay',
  name: 'Razorpay (UPI)',
  category: 'payments',
  status: 'available',
  color: '#0C2451',
  description: 'UPI, cards, netbanking and wallets for INR shops (Razorpay Payment Links).',
  docsUrl: 'https://razorpay.com/docs/api/payments/payment-links/',
  test: { support: 'sandbox', note: 'Use rzp_test_ keys; test payments use Razorpay\'s test UPI IDs and cards.' },
  webhookSetup: { where: 'Razorpay Dashboard -> Webhooks (event payment_link.paid, with the webhook secret above)', what: 'Payment notifications: paid links mark the sale "Paid online" automatically.' },
  secrets: [
    { name: 'RAZORPAY_KEY_ID', label: 'Razorpay key ID', hint: 'Dashboard -> Account & Settings -> API keys. Starts with rzp_live_ (rzp_test_ under Test keys).' },
    { name: 'RAZORPAY_KEY_SECRET', label: 'Razorpay key secret' },
    { name: 'RAZORPAY_WEBHOOK_SECRET', label: 'Webhook secret', hint: 'Optional: the secret you type when adding the webhook in Razorpay.', optional: true },
  ],
  /** POST /webhooks/razorpay[/test] -- payment_link.paid, signed with the webhook secret. */
  async webhook({ request, rawBody, env, store, mode, emit }) {
    const secret = String(env.RAZORPAY_WEBHOOK_SECRET || '').trim();
    if (!secret) throw Object.assign(new Error('Webhook secret not set.'), { status: 409 });
    const sig = String(request.headers.get('X-Razorpay-Signature') || '');
    if (!sig || !same(sig, await hmacHex(secret, rawBody))) throw Object.assign(new Error('Bad signature.'), { status: 401 });
    let e; try { e = JSON.parse(rawBody); } catch { return { ignored: true }; }
    if (e.event !== 'payment_link.paid') return { received: true, ignored: e.event };
    const linkId = e.payload?.payment_link?.entity?.id;
    const txId = linkId && (await store.get(`link:${linkId}`));
    if (!txId) return { received: true, ignored: 'unknown link' };
    const link = await rz(env, 'GET', `/payment_links/${encodeURIComponent(linkId)}`); // ask Razorpay directly before telling Stratek
    if (link.status !== 'paid') return { received: true, ignored: `link ${link.status}` };
    await report({ emit, store, txId, link, mode });
    return { received: true };
  },
  actions: [
    {
      id: 'test', label: 'Test Razorpay', placement: ['settings'], fields: [],
      async run({ env }) {
        await rz(env, 'GET', '/payment_links?count=1');
        const test = String(env.RAZORPAY_KEY_ID).startsWith('rzp_test_');
        return { type: 'message', title: 'Razorpay is connected', text: `${test ? 'TEST' : 'LIVE'} keys work.${env.RAZORPAY_WEBHOOK_SECRET ? ' Webhook secret saved.' : ' Add the webhook (see Set up) so paid links are marked by themselves.'}` };
      },
    },
    {
      id: 'payment_link', label: 'Pay with UPI / card (Razorpay)', placement: ['charge'], fields: [],
      async run({ env, context, store, claims }) {
        const tx = sale(context); inrOnly(tx);
        const amount = toMinor(tx.amount, 'INR');
        const saved = await store.get(`tx:${tx.id}`);
        if (saved?.linkId && saved.amount === amount && saved.status !== 'paid') return { type: 'qr', title: `Pay INR ${tx.amount}`, text: 'Customer scans this to pay with UPI, card or netbanking. Then use "Check Razorpay payment" on the sale.', qrPayload: saved.url };
        const l = await rz(env, 'POST', '/payment_links', { amount, currency: 'INR', reference_id: `stratek-${tx.id}-${Date.now().toString(36)}`, description: `${claims?.owner_name || 'Shop'} -- sale #${tx.id}`.slice(0, 2048), notify: { sms: false, email: false }, reminder_enable: false, notes: { stratek_transaction: tx.id }, expire_by: Math.floor(Date.now() / 1000) + 24 * 3600 });
        await store.put(`tx:${tx.id}`, { linkId: l.id, url: l.short_url, amount });
        await store.put(`link:${l.id}`, tx.id);
        return { type: 'qr', title: `Pay INR ${tx.amount}`, text: `Customer scans this to pay with UPI, card or netbanking${String(env.RAZORPAY_KEY_ID).startsWith('rzp_test_') ? ' (TEST mode)' : ''}. Then use "Check Razorpay payment" on the sale.`, qrPayload: l.short_url };
      },
    },
    {
      id: 'check', label: 'Check Razorpay payment', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode, emit }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved?.linkId) return { type: 'message', title: 'No Razorpay payment', text: 'No Razorpay payment was started for this sale.' };
        const link = await rz(env, 'GET', `/payment_links/${encodeURIComponent(saved.linkId)}`);
        if (link.status === 'paid') { await report({ emit, store, txId: tx.id, link, mode }); return { type: 'status', title: 'Razorpay', status: 'Paid', text: 'The customer has paid. Now press Settle on this sale.' }; }
        return { type: 'status', title: 'Razorpay', status: link.status === 'expired' || link.status === 'cancelled' ? 'Expired' : 'Waiting', text: 'Not paid yet.' };
      },
    },
    {
      id: 'refund', outbound: true, label: 'Refund Razorpay payment', placement: ['transaction'],
      fields: [{ name: 'amount', label: 'Amount to refund in INR (empty = all)', type: 'number' }],
      async run({ env, context, store, fields }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved?.paymentId || saved.status !== 'paid') throw new Error('This sale has no paid Razorpay payment. Press "Check Razorpay payment" first.');
        const amount = fields.amount ? toMinor(fields.amount, 'INR') : undefined;
        if (amount && amount > saved.paidPaise) throw new Error('Refund amount is more than was paid.');
        const r = await rz(env, 'POST', `/payments/${encodeURIComponent(saved.paymentId)}/refund`, { ...(amount ? { amount } : {}), notes: { stratek_transaction: tx.id } });
        return { type: 'status', title: 'Razorpay refund', status: r.status || 'processed', text: `Refund ${r.id}: INR ${(Number(r.amount) / 100).toFixed(2)}.` };
      },
    },
  ],
};
