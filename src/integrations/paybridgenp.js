// paybridgenp -- PayBridgeNP (eSewa, Khalti, Fonepay aggregator, Nepal).
// Docs: https://docs.paybridgenp.com
//
// How Stratek uses it (when "Use for the till & kiosk QR" is on in Stratek):
//   1. Charge total (till) / Pay with QR (kiosk): Stratek asks this connector for
//      the payment QR -> action `till_qr` -> POST /v1/qr/fonepay (Direct QR).
//      The QR is a real Fonepay QR any bank/wallet app scans. Asking again for
//      the same sale refreshes the same session (QRs last ~3 min, sessions 30 min).
//   2. PayBridgeNP calls POST <connector>/webhooks/paybridgenp ("payment.succeeded"),
//      signed with X-PayBridgeNP-Signature (HMAC-SHA256 over "<t>.<raw body>").
//      The connector checks the signature, re-checks the session with the API,
//      and sends Stratek a signed event -> the sale shows "Paid online (verified)".
//      A person at the shop still presses Settle (human in the loop).
//   Saving the key registers the webhook automatically (onKeysSaved).
//
// Buttons: Test PayBridgeNP (Integrations tab); Check online payment and Refund
// online payment (sale details).

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
  qrProvider: true,
  color: '#1f6feb',
  description: 'Fonepay QR at the till and kiosk that detects payment by itself (eSewa, Khalti, Fonepay aggregator, Nepal).',
  docsUrl: 'https://docs.paybridgenp.com/api-reference/overview',
  secrets: [
    { name: 'PAYBRIDGE_SECRET_KEY', label: 'PayBridgeNP secret key', hint: 'From your PayBridgeNP dashboard, live project (starts with sk_live_; needs permission for payments and webhooks). Connect your Fonepay merchant account inside PayBridgeNP first. Live Fonepay QRs need the Pro plan.' },
  ],
  test: {
    support: 'real-money',
    note: 'Fonepay has no sandbox: a test-mode Fonepay QR still moves real money (max Rs 1,000 per payment). Stratek marks these as test payments.',
    hints: { PAYBRIDGE_SECRET_KEY: 'Your sandbox project key (starts with sk_test_; payments + webhooks permission).' },
  },

  /** After the key is saved: register this connector for payment notifications. */
  async onKeysSaved({ env, store, origin, mode }) {
    const url = `${origin}/webhooks/paybridgenp${mode === 'test' ? '/test' : ''}`;
    const list = await pb(env, 'GET', '/webhooks').catch(() => null);
    const endpoints = Array.isArray(list) ? list : list?.data || list?.endpoints || [];
    for (const e of endpoints) {
      if (e?.url === url && e.id) await pb(env, 'DELETE', `/webhooks/${encodeURIComponent(e.id)}`).catch(() => {});
    }
    const created = await pb(env, 'POST', '/webhooks', { url, events: ['payment.succeeded', 'payment.failed', 'payment.cancelled', 'payment.refunded'] });
    const secret = created?.signing_secret || created?.data?.signing_secret;
    if (!secret) throw new Error('PayBridgeNP did not return a webhook signing secret.');
    await store.put('webhook', { id: created.id || created?.data?.id, secret, url, createdAt: new Date().toISOString() });
    return 'payment notifications are switched on';
  },

  /** POST /webhooks/paybridgenp -- PayBridgeNP says a payment changed. */
  async webhook({ request, rawBody, env, store, emit }) {
    const hook = await store.get('webhook');
    if (!hook?.secret) throw Object.assign(new Error('Webhook not set up.'), { status: 409 });
    const header = request.headers.get('X-PayBridgeNP-Signature') || '';
    const parts = Object.fromEntries(header.split(',').map((kv) => kv.trim().split('=')).filter((p) => p.length === 2));
    const t = Number(parts.t);
    if (!t || Math.abs(Date.now() / 1000 - t) > 300) throw Object.assign(new Error('Old or missing timestamp.'), { status: 401 });
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(hook.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${rawBody}`)));
    const expected = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
    const got = String(parts.v1 || '');
    let diff = got.length === expected.length ? 0 : 1;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ (got.charCodeAt(i) || 0);
    if (diff) throw Object.assign(new Error('Bad signature.'), { status: 401 });

    const body = JSON.parse(rawBody);
    const type = body.type || body.event;
    const ev = body.data?.object || body.data || body;
    if (type !== 'payment.succeeded') return { received: true, ignored: type };
    const sessionId = ev.session_id || ev.sessionId;
    const txId = sessionId && (await store.get(`session:${sessionId}`));
    if (!txId) return { received: true, ignored: 'unknown session' };
    // Defence in depth: ask PayBridgeNP directly before telling Stratek.
    const s = await pb(env, 'GET', `/sessions/${encodeURIComponent(sessionId)}`);
    if (s.status !== 'success') return { received: true, ignored: `session ${s.status}` };
    const paymentId = s.paymentId || ev.id;
    const saved = await store.get(`tx:${txId}`);
    await store.put(`tx:${txId}`, { ...saved, paymentId, status: 'success' });
    await emit({
      id: `paybridgenp-${paymentId}`,
      type: 'payment.succeeded',
      data: { transactionId: String(txId), amount: s.amount / 100, currency: s.currency || 'NPR', provider: 'PayBridgeNP', integration: 'paybridgenp', webhookId: hook.id || null, providerRef: paymentId, method: s.provider || ev.provider || 'fonepay', livemode: s.livemode !== false },
    });
    return { received: true, forwarded: true };
  },
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
      // Hidden action: Stratek asks "is this ready to run a kiosk?" (placement 'health' is never a button).
      id: 'health',
      label: 'Payment notifications health',
      placement: ['health'],
      fields: [],
      async run({ env, store }) {
        const a = await pb(env, 'GET', '/account');
        const livemode = a?.project?.mode ? a.project.mode !== 'sandbox' : !String(env.PAYBRIDGE_SECRET_KEY || '').startsWith('sk_test_');
        const hook = await store.get('webhook');
        let webhookRegistered = false;
        if (hook?.id) {
          const list = await pb(env, 'GET', '/webhooks').catch(() => null);
          const endpoints = Array.isArray(list) ? list : list?.data || list?.endpoints || [];
          webhookRegistered = endpoints.some((e) => e?.id === hook.id && e.url === hook.url && e.enabled !== false && e.active !== false);
        }
        return { type: 'health', ready: true, livemode, webhookRegistered, webhookId: webhookRegistered ? hook.id : null };
      },
    },
    {
      // Hidden action: Stratek calls it to get the till/kiosk QR (placement 'qr' is never a button).
      id: 'till_qr',
      label: 'Fonepay QR for the till',
      placement: ['qr'],
      fields: [],
      async run({ env, context, store, claims }) {
        const tx = context?.transaction || {};
        const id = saleId(context);
        if (tx.currency && tx.currency !== 'NPR') throw new Error('Fonepay only takes payments in NPR.');
        const paisa = Math.round(Number(tx.amount) * 100);
        if (!Number.isFinite(paisa) || paisa < 1000) throw new Error('PayBridgeNP needs at least Rs 10.');
        const saved = await store.get(`tx:${id}`);
        let q = null;
        if (saved?.kind === 'fonepay' && saved.amount === paisa) {
          // Same sale again: a fresh QR for the same session.
          q = await pb(env, 'POST', `/qr/${encodeURIComponent(saved.sessionId)}/refresh`).catch(() => null);
        }
        if (!q) {
          q = await pb(env, 'POST', '/qr/fonepay', {
            amount: paisa,
            currency: 'NPR',
            customer: { name: String(claims.owner_name || 'Customer').slice(0, 100), email: claims.actor && String(claims.actor).includes('@') ? claims.actor : 'customer@example.com' },
            metadata: { stratek_transaction: id, reference: tx.reference || null },
          }, `stratek-fonepay-${claims.aud}-${id}-${paisa}`);
          await store.put(`tx:${id}`, { sessionId: q.id, amount: paisa, kind: 'fonepay', createdAt: new Date().toISOString() });
          await store.put(`session:${q.id}`, id);
        }
        return {
          type: 'qr',
          title: `Fonepay QR -- Rs ${(paisa / 100).toFixed(2)}`,
          text: 'Scan with any bank app or wallet that reads Fonepay QRs.',
          qrPayload: q.qr_message,
          provider: 'PayBridgeNP',
          refreshAfterSec: 170,
          expiresAt: q.expires_at || null,
          livemode: q.livemode !== false,
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
      outbound: true, // money leaves the shop: agents can only request it
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
