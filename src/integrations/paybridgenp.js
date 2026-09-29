// paybridgenp -- online payments through PayBridgeNP: one hosted checkout for
// eSewa, Khalti and Fonepay (Nepal). Docs: https://docs.paybridgenp.com
//
// Buttons
//   Test PayBridgeNP (Integrations tab)  GET /v1/account -- shows project + sandbox/live
//   Pay online (under the payment QR)     POST /v1/checkout -> QR of the checkout link;
//                                        the customer scans it and picks eSewa/Khalti/Fonepay
//   Check online payment (sale details)  GET /v1/sessions/:id -> paid / pending / failed
//   Refund online payment (sale details) POST /v1/refunds (Khalti automatic, eSewa manual
//                                        in their portal, Fonepay not supported)
//
// Amounts: Stratek sends rupees; PayBridgeNP wants paisa (x100), minimum Rs 10.
// After "Paid", the shop presses Settle in Stratek. (Automatic confirmation via
// signed webhooks comes with Stratek's signed-events update.)

const API = 'https://api.paybridgenp.com/v1';

async function pb(env, method, path, body, idempotencyKey) {
  const headers = { Authorization: `Bearer ${env.PAYBRIDGE_SECRET_KEY}`, Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || (typeof data?.error === 'string' ? data.error : null);
    if (res.status === 401) throw new Error('PayBridgeNP did not accept the secret key. Check it in Set up.');
    if (res.status === 403) throw new Error(`This PayBridgeNP key is missing a permission${msg ? `: ${msg}` : ''}.`);
    throw new Error(`PayBridgeNP: ${msg || `error ${res.status}`}`);
  }
  return data;
}

const saleId = (context) => {
  const id = context?.transaction?.id;
  if (!id) throw new Error('Open this from a sale.');
  return String(id);
};

const STATUS = {
  success: ['Paid', 'The customer has paid online. Now press Settle on this sale.'],
  pending: ['Waiting', 'The customer has not paid yet.'],
  initiated: ['In progress', 'The customer started paying but has not finished.'],
  failed: ['Failed', 'The payment failed. You can start a new one from the charge screen.'],
  cancelled: ['Cancelled', 'The customer cancelled the payment.'],
  expired: ['Expired', 'The payment link expired. Start a new one if needed.'],
};

export default {
  id: 'paybridgenp',
  name: 'PayBridgeNP',
  category: 'payments',
  status: 'available',
  description: 'eSewa, Khalti and Fonepay in one online checkout (Nepal).',
  docsUrl: 'https://docs.paybridgenp.com/api-reference/overview',
  secrets: [
    { name: 'PAYBRIDGE_SECRET_KEY', label: 'PayBridgeNP secret key', hint: 'From your PayBridgeNP dashboard. Starts with sk_live_ (or sk_test_ for testing -- note Fonepay has no sandbox, test payments move real money).' },
  ],
  actions: [
    {
      id: 'test',
      label: 'Test PayBridgeNP',
      placement: ['settings'],
      fields: [],
      async run({ env }) {
        const a = await pb(env, 'GET', '/account');
        const mode = a?.project?.mode === 'sandbox' ? 'TEST (sandbox)' : 'LIVE';
        return { type: 'message', title: 'PayBridgeNP is connected', text: `${a?.merchant?.name || 'Account'} -- project "${a?.project?.name || '?'}", ${mode} mode.` };
      },
    },
    {
      id: 'payment_link',
      label: 'Pay online (eSewa / Khalti / Fonepay)',
      placement: ['charge'],
      fields: [],
      async run({ env, context, origin, store, claims }) {
        const tx = context?.transaction || {};
        const id = saleId(context);
        if (tx.currency && tx.currency !== 'NPR') throw new Error('PayBridgeNP only takes payments in NPR.');
        const paisa = Math.round(Number(tx.amount) * 100);
        if (!Number.isFinite(paisa) || paisa < 1000) throw new Error('Online payments need at least Rs 10.');
        const s = await pb(env, 'POST', '/checkout', {
          amount: paisa,
          currency: 'NPR',
          returnUrl: `${origin}/paid`,
          cancelUrl: `${origin}/paid`,
          description: `${claims.owner_name || 'Shop'} -- sale #${id}`.slice(0, 200),
          metadata: { stratek_transaction: id, reference: tx.reference || null },
        }, `stratek-${claims.aud}-${id}-${paisa}`);
        await store.put(`tx:${id}`, { sessionId: s.id, amount: paisa, createdAt: new Date().toISOString() });
        return {
          type: 'qr',
          title: `Pay online -- Rs ${(paisa / 100).toFixed(2)}`,
          text: `Customer scans this to pay with eSewa, Khalti or Fonepay${s.livemode === false ? ' (TEST mode)' : ''}. Then use "Check online payment" on the sale.`,
          qrPayload: s.checkout_url,
        };
      },
    },
    {
      id: 'check',
      label: 'Check online payment',
      placement: ['transaction'],
      fields: [],
      async run({ env, context, store }) {
        const id = saleId(context);
        const saved = await store.get(`tx:${id}`);
        if (!saved) return { type: 'message', title: 'No online payment', text: 'No PayBridgeNP payment was started for this sale.' };
        const s = await pb(env, 'GET', `/sessions/${encodeURIComponent(saved.sessionId)}`);
        if (s.paymentId && s.paymentId !== saved.paymentId) await store.put(`tx:${id}`, { ...saved, paymentId: s.paymentId, status: s.status });
        const [status, text] = STATUS[s.status] || [s.status, ''];
        return { type: 'status', title: 'PayBridgeNP', status, text: `${text} Amount Rs ${(s.amount / 100).toFixed(2)}${s.provider ? ` via ${s.provider}` : ''}.` };
      },
    },
    {
      id: 'refund',
      label: 'Refund online payment',
      placement: ['transaction'],
      fields: [
        { name: 'amount', label: 'Amount to refund (Rs, empty = all)', type: 'number' },
        { name: 'note', label: 'Note (optional)', type: 'text' },
      ],
      async run({ env, context, store, fields }) {
        const id = saleId(context);
        let saved = await store.get(`tx:${id}`);
        if (!saved) throw new Error('No PayBridgeNP payment was started for this sale.');
        if (!saved.paymentId) {
          const s = await pb(env, 'GET', `/sessions/${encodeURIComponent(saved.sessionId)}`);
          if (!s.paymentId) throw new Error('This sale has not been paid online, so there is nothing to refund.');
          saved = { ...saved, paymentId: s.paymentId };
          await store.put(`tx:${id}`, saved);
        }
        const amount = fields.amount ? Math.round(Number(fields.amount) * 100) : saved.amount;
        if (!Number.isFinite(amount) || amount <= 0 || amount > saved.amount) throw new Error('Refund amount must be more than 0 and at most the amount paid.');
        const r = await pb(env, 'POST', '/refunds', { paymentId: saved.paymentId, amount, reason: 'customer_request', notes: fields.note || undefined }, `stratek-refund-${saved.paymentId}-${amount}`);
        const text = r.status === 'requires_action'
          ? 'Recorded. eSewa refunds must be finished in the eSewa merchant portal.'
          : r.status === 'succeeded' ? 'Refunded.' : `Refund status: ${r.status}.`;
        return { type: 'status', title: 'PayBridgeNP refund', status: r.status, text: `${text} Rs ${(r.amount / 100).toFixed(2)}.` };
      },
    },
  ],
};
