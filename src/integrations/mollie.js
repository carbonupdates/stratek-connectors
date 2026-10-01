// mollie -- cards, iDEAL, Bancontact, Apple Pay, PayPal and more through Mollie (Europe).
// my.mollie.com -> Developers -> API keys: live_... (test_... under Test keys).
// Mollie calls this connector when a payment changes (webhook, set per payment -- nothing
// to set up); the connector then asks Mollie for the status, so the call can't be faked.
//   API: https://api.mollie.com/v2 (Bearer) -- POST /payments, GET /payments/{id},
//        POST /payments/{id}/refunds, GET /methods
// Buttons: Test Mollie (Integrations tab); Pay with Mollie under the payment QR;
// Check Mollie payment, Refund Mollie payment (needs a person) on the sale.

import { sale, toDecimalString } from './_util.js';
import { readJson } from './_ship.js';

async function mo(env, method, path, body) {
  const res = await fetch(`https://api.mollie.com/v2${path}`, { method, headers: { Authorization: `Bearer ${String(env.MOLLIE_API_KEY).trim()}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 401) throw new Error('Mollie did not accept the API key.');
  if (!res.ok) throw new Error(`Mollie: ${j?.detail || j?.title || `error ${res.status}`}`);
  return j || {};
}

async function report({ emit, store, txId, p, mode }) {
  const saved = (await store.get(`tx:${txId}`)) || {};
  if (!saved.reported) await emit({ id: `mollie-${p.id}`, type: 'payment.succeeded', data: { transactionId: String(txId), amount: Number(p.amount?.value), currency: p.amount?.currency, provider: 'Mollie', integration: 'mollie', providerRef: p.id, method: p.method || 'mollie', livemode: p.mode ? p.mode === 'live' : mode !== 'test' } });
  await store.put(`tx:${txId}`, { ...saved, paid: true, reported: true });
}

export default {
  id: 'mollie',
  name: 'Mollie',
  category: 'payments',
  status: 'available',
  color: '#000000',
  description: 'Cards, iDEAL, Bancontact, Apple Pay and more through Mollie (Europe).',
  docsUrl: 'https://docs.mollie.com/reference/create-payment',
  test: { support: 'sandbox', note: 'Save your test_ key under Test keys; Mollie\'s test checkout lets you pick the result.' },
  secrets: [
    { name: 'MOLLIE_API_KEY', label: 'Mollie API key', hint: 'my.mollie.com -> Developers -> API keys (live_...; test_... under Test keys).' },
  ],
  /** POST /webhooks/mollie[/test] -- Mollie sends only the payment id; we ask Mollie for the real status. */
  async webhook({ rawBody, env, store, mode, emit }) {
    const id = new URLSearchParams(rawBody).get('id') || '';
    if (!/^tr_[A-Za-z0-9]{4,}$/.test(id)) return { ignored: true };
    const txId = await store.get(`pay:${id}`);
    if (!txId) return { ignored: 'unknown payment' };
    const p = await mo(env, 'GET', `/payments/${encodeURIComponent(id)}`);
    if (p.status === 'paid') await report({ emit, store, txId, p, mode });
    return { received: true };
  },
  actions: [
    {
      id: 'test', label: 'Test Mollie', placement: ['settings'], fields: [],
      async run({ env }) {
        const m = await mo(env, 'GET', '/methods');
        const names = (m._embedded?.methods || []).map((x) => x.description);
        return { type: 'message', title: 'Mollie is connected', text: `${String(env.MOLLIE_API_KEY).startsWith('test_') ? 'TEST' : 'LIVE'} key. Active methods: ${names.slice(0, 8).join(', ') || 'none yet (switch some on in Mollie)'}.` };
      },
    },
    {
      id: 'payment_link', label: 'Pay with Mollie', placement: ['charge'], fields: [],
      async run({ env, context, store, mode, origin, claims }) {
        const tx = sale(context);
        const value = toDecimalString(tx.amount, tx.currency);
        const saved = await store.get(`tx:${tx.id}`);
        if (saved?.url && saved.value === value && !saved.paid) return { type: 'qr', title: `Pay ${tx.currency} ${value}`, text: 'Customer scans this to pay. Then use "Check Mollie payment" on the sale.', qrPayload: saved.url };
        const p = await mo(env, 'POST', '/payments', { amount: { currency: tx.currency, value }, description: `${claims?.owner_name || 'Shop'} sale #${tx.id}`.slice(0, 255), redirectUrl: `${origin}/paid`, webhookUrl: `${origin}/webhooks/mollie${mode === 'test' ? '/test' : ''}`, metadata: { stratek_transaction: tx.id } });
        const url = p._links?.checkout?.href;
        await store.put(`tx:${tx.id}`, { id: p.id, url, value, currency: tx.currency });
        await store.put(`pay:${p.id}`, tx.id);
        return { type: 'qr', title: `Pay ${tx.currency} ${value}`, text: `Customer scans this to pay${p.mode === 'test' ? ' (TEST)' : ''}. The sale is marked Paid online when Mollie confirms.`, qrPayload: url };
      },
    },
    {
      id: 'check', label: 'Check Mollie payment', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode, emit }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved?.id) return { type: 'message', title: 'No Mollie payment', text: 'No Mollie payment was started for this sale.' };
        const p = await mo(env, 'GET', `/payments/${encodeURIComponent(saved.id)}`);
        if (p.status !== 'paid') return { type: 'status', title: 'Mollie', status: ['expired', 'canceled', 'failed'].includes(p.status) ? 'Expired' : 'Waiting', text: `Mollie says: ${p.status}.` };
        await report({ emit, store, txId: tx.id, p, mode });
        return { type: 'status', title: 'Mollie', status: 'Paid', text: 'The customer has paid. Now press Settle on this sale.' };
      },
    },
    {
      id: 'refund', outbound: true, label: 'Refund Mollie payment', placement: ['transaction'], fields: [{ name: 'amount', label: 'Amount to refund (empty = all)', type: 'number' }],
      async run({ env, context, store, fields }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved?.paid) throw new Error('This sale has no paid Mollie payment. Press "Check Mollie payment" first.');
        const value = fields.amount ? toDecimalString(fields.amount, saved.currency) : saved.value;
        if (Number(value) > Number(saved.value)) throw new Error('Refund amount is more than was paid.');
        const r = await mo(env, 'POST', `/payments/${encodeURIComponent(saved.id)}/refunds`, { amount: { currency: saved.currency, value }, description: `Stratek sale #${tx.id}` });
        return { type: 'status', title: 'Mollie refund', status: r.status || 'queued', text: `Refund ${r.id}: ${saved.currency} ${value}.` };
      },
    },
  ],
};
