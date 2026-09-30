// khalti -- Khalti web checkout (KPG-2) for a sale: the customer scans a QR that opens
// Khalti's payment page, pays with their Khalti wallet / mobile banking / cards.
// When they come back, this connector checks the payment with Khalti (lookup) and tells
// Stratek (signed "payment.succeeded" -> the sale shows "Paid online"; a person still settles).
//   Sandbox https://dev.khalti.com/api/v2 -- Live https://khalti.com/api/v2
//   Docs: https://docs.khalti.com/khalti-epayment/
// Buttons: Test Khalti (Integrations tab); Pay with Khalti (under the payment QR);
// Check Khalti payment, Refund Khalti payment (needs a person) (sale details).

import { sale } from './_util.js';
import { paisa, rupees, requireNpr, resultPage, emitPaid } from './_nepal.js';

const base = (mode) => (mode === 'test' ? 'https://dev.khalti.com/api/v2' : 'https://khalti.com/api/v2');
const refundBase = (mode) => (mode === 'test' ? 'https://dev.khalti.com/api' : 'https://khalti.com/api');

async function khalti(env, mode, path, body, root = base(mode)) {
  const res = await fetch(`${root}${path}`, { method: 'POST', headers: { Authorization: `Key ${String(env.KHALTI_SECRET_KEY).trim()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const j = await res.json().catch(() => null);
  if (res.status === 401) throw new Error('Khalti did not accept the secret key. Check it in Set up (live key for Live, sandbox key for Test).');
  return { ok: res.ok, status: res.status, j: j || {} };
}
const errText = (j) => j?.detail || j?.error_key || Object.entries(j || {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join('; ') || 'error';

/** Looks the payment up; tells Stratek once it is Completed. */
async function checkAndReport({ env, mode, store, emit, pidx }) {
  const txId = await store.get(`pidx:${pidx}`);
  if (!txId) return { known: false };
  const r = await khalti(env, mode, '/epayment/lookup/', { pidx });
  const status = r.j.status || (r.ok ? 'Unknown' : 'Error');
  const saved = (await store.get(`tx:${txId}`)) || {};
  await store.put(`tx:${txId}`, { ...saved, status, transactionId: r.j.transaction_id || saved.transactionId || null });
  if (status === 'Completed' && !saved.reported && emit) {
    await emitPaid(emit, { integration: 'khalti', provider: 'Khalti', txId, amountPaisa: Number(r.j.total_amount) || saved.amount, ref: r.j.transaction_id || pidx, livemode: mode !== 'test' });
    await store.put(`tx:${txId}`, { ...saved, status, transactionId: r.j.transaction_id || null, reported: true });
  }
  return { known: true, txId, status, lookup: r.j };
}

export default {
  id: 'khalti',
  name: 'Khalti',
  category: 'payments',
  status: 'available',
  color: '#5C2D91',
  description: 'Khalti checkout for a sale: the customer scans, pays with Khalti, and Stratek sees the payment.',
  docsUrl: 'https://docs.khalti.com/khalti-epayment/',
  test: { support: 'sandbox', note: 'Sandbox keys from test-admin.khalti.com. Test Khalti IDs 9800000000-9800000005, MPIN 1111, OTP 987654.' },
  secrets: [
    { name: 'KHALTI_SECRET_KEY', label: 'Khalti secret key', hint: 'Khalti merchant dashboard (admin.khalti.com) -> Keys -> Live secret key. For Test keys use test-admin.khalti.com.' },
  ],
  async payReturn({ url, env, mode, store, emit }) {
    const pidx = url.searchParams.get('pidx');
    if (!pidx) return resultPage(false);
    const r = await checkAndReport({ env, mode, store, emit, pidx });
    if (!r.known) return resultPage(false, 'This payment is not from this shop.');
    return r.status === 'Completed' ? resultPage(true) : resultPage(false, r.status === 'Pending' ? 'Your payment is still being processed. The shop will see it when Khalti confirms.' : undefined);
  },
  actions: [
    {
      id: 'test', label: 'Test Khalti', placement: ['settings'], fields: [],
      async run({ env, mode }) {
        const r = await khalti(env, mode, '/epayment/lookup/', { pidx: 'stratek-key-check' });
        if (r.status === 401) throw new Error('Khalti did not accept the key.');
        return { type: 'message', title: 'Khalti is connected', text: `Khalti accepted the ${mode === 'test' ? 'sandbox' : 'live'} key.` };
      },
    },
    {
      id: 'payment_link', label: 'Pay with Khalti', placement: ['charge'], fields: [],
      async run({ env, context, origin, store, claims, mode }) {
        const tx = sale(context);
        requireNpr(tx, 'Khalti');
        const amount = paisa(tx.amount);
        if (amount < 1000) throw new Error('Khalti needs at least Rs 10.');
        const c = context?.customer || {};
        const r = await khalti(env, mode, '/epayment/initiate/', {
          return_url: `${origin}/pay/khalti/return/${mode}`,
          website_url: origin,
          amount,
          purchase_order_id: `stratek-${tx.id}-${Date.now().toString(36)}`,
          purchase_order_name: `${claims?.owner_name || 'Shop'} sale #${tx.id}`.slice(0, 100),
          ...(c.name || c.email || c.phone ? { customer_info: { ...(c.name ? { name: c.name } : {}), ...(c.email ? { email: c.email } : {}), ...(c.phone ? { phone: String(c.phone) } : {}) } } : {}),
        });
        if (!r.ok || !r.j.payment_url) throw new Error(`Khalti: ${errText(r.j)}`);
        await store.put(`pidx:${r.j.pidx}`, tx.id);
        await store.put(`tx:${tx.id}`, { pidx: r.j.pidx, amount, status: 'Initiated', createdAt: new Date().toISOString() });
        return { type: 'qr', title: `Pay with Khalti -- Rs ${rupees(amount)}`, text: `The customer scans this and pays with Khalti${mode === 'test' ? ' (TEST sandbox)' : ''}. Stratek sees the payment when they finish.`, qrPayload: r.j.payment_url };
      },
    },
    {
      id: 'check', label: 'Check Khalti payment', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode, emit }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved?.pidx) return { type: 'message', title: 'No Khalti payment', text: 'No Khalti payment was started for this sale.' };
        const r = await checkAndReport({ env, mode, store, emit, pidx: saved.pidx });
        return { type: 'status', title: 'Khalti', status: r.status === 'Completed' ? 'Paid' : r.status, text: r.status === 'Completed' ? 'The customer has paid with Khalti. Now press Settle on this sale.' : 'Not paid yet.' };
      },
    },
    {
      id: 'refund', outbound: true, label: 'Refund Khalti payment', placement: ['transaction'],
      fields: [{ name: 'amount', label: 'Amount to refund in Rs (empty = all)', type: 'number' }],
      async run({ env, context, store, fields, mode }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved?.transactionId || saved.status !== 'Completed') throw new Error('This sale has no completed Khalti payment to refund. Press "Check Khalti payment" first.');
        const amount = fields.amount ? paisa(fields.amount) : undefined;
        if (amount && amount > saved.amount) throw new Error('Refund amount is more than was paid.');
        const r = await khalti(env, mode, `/merchant-transaction/${encodeURIComponent(saved.transactionId)}/refund/`, amount ? { amount } : {}, refundBase(mode));
        if (!r.ok) throw new Error(`Khalti refund: ${errText(r.j)}`);
        await store.put(`tx:${tx.id}`, { ...saved, status: amount && amount < saved.amount ? 'Partially Refunded' : 'Refunded' });
        return { type: 'status', title: 'Khalti refund', status: 'Refunded', text: r.j.detail || `Rs ${rupees(amount || saved.amount)} refunded.` };
      },
    },
  ],
};
