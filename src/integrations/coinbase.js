// coinbase -- crypto payments through Coinbase Business checkouts (CDP API key).
// Docs: https://docs.cdp.coinbase.com/coinbase-business/
//
// Buttons
//   Test Coinbase (Integrations tab)        lists recent checkouts (checks the key)
//   Pay with crypto (under the QR)          POST /api/v1/checkouts -> QR of the hosted payment page
//   Check crypto payment (sale details)     GET /api/v1/checkouts/:id
//   Refund crypto payment (sale details)    POST /api/v1/checkouts/:id/refund
// Auth: each request carries a short-lived JWT signed with the CDP API key
// (Ed25519 keys; create one in the CDP portal with the "Ed25519" signature algorithm).
// Accepted currencies are set by Coinbase (e.g. USD, EUR, GBP, SGD, USDC) -- not NPR.

import { sale, b64url, b64urlText } from './_util.js';

const HOST = 'business.coinbase.com';

async function jwt(env, method, path) {
  const raw = Uint8Array.from(atob(String(env.COINBASE_API_PRIVATE_KEY).trim()), (c) => c.charCodeAt(0));
  if (raw.length !== 64) throw new Error('The Coinbase private key must be an Ed25519 key (base64, from the CDP portal). ECDSA keys are not supported yet.');
  const key = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', d: b64url(raw.slice(0, 32)), x: b64url(raw.slice(32)) }, { name: 'Ed25519' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const nonce = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const name = String(env.COINBASE_API_KEY_NAME).trim();
  const head = b64urlText(JSON.stringify({ alg: 'EdDSA', kid: name, typ: 'JWT', nonce }));
  const body = b64urlText(JSON.stringify({ sub: name, iss: 'cdp', nbf: now, exp: now + 120, uris: [`${method} ${HOST}${path}`] }));
  const sig = await crypto.subtle.sign({ name: 'Ed25519' }, key, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(sig)}`;
}

async function cb(env, method, path, bodyObj) {
  const res = await fetch(`https://${HOST}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await jwt(env, method, path.split('?')[0])}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: bodyObj ? JSON.stringify(bodyObj) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Coinbase did not accept the API key. Check the key name and private key in Set up.');
    throw new Error(`Coinbase: ${data?.message || data?.error || `error ${res.status}`}`);
  }
  return data;
}

const STATUS = { COMPLETED: 'Paid', ACTIVE: 'Waiting', PROCESSING: 'Processing', EXPIRED: 'Expired', FAILED: 'Failed', DEACTIVATED: 'Cancelled', REFUNDED: 'Refunded', PARTIALLY_REFUNDED: 'Partly refunded' };

export default {
  id: 'coinbase',
  name: 'Coinbase (crypto)',
  category: 'payments',
  status: 'available',
  description: 'Crypto payments (e.g. USDC) through Coinbase Business checkouts.',
  docsUrl: 'https://docs.cdp.coinbase.com/coinbase-business/',
  test: { support: 'none', note: 'Coinbase Business checkouts have no test environment Stratek can rely on, so Coinbase runs with live keys only.' },
  secrets: [
    { name: 'COINBASE_API_KEY_NAME', label: 'CDP API key ID / name', hint: 'From the Coinbase Developer Platform portal (API keys). Use the Ed25519 signature algorithm.' },
    { name: 'COINBASE_API_PRIVATE_KEY', label: 'CDP API private key (Ed25519, base64)', hint: 'The "secret" shown once when the key is created.' },
  ],
  actions: [
    {
      id: 'test', label: 'Test Coinbase', placement: ['settings'], fields: [],
      async run({ env }) {
        const d = await cb(env, 'GET', '/api/v1/checkouts?pageSize=1');
        return { type: 'message', title: 'Coinbase is connected', text: `API key accepted${Array.isArray(d?.checkouts) ? ` (${d.checkouts.length ? 'has' : 'no'} earlier checkouts)` : ''}.` };
      },
    },
    {
      id: 'payment_link', label: 'Pay with crypto (Coinbase)', placement: ['charge'], fields: [],
      async run({ env, context, origin, store, claims }) {
        const tx = sale(context);
        const c = await cb(env, 'POST', '/api/v1/checkouts', {
          amount: Number(tx.amount).toFixed(2),
          currency: tx.currency,
          description: `${claims.owner_name || 'Shop'} -- sale #${tx.id}`.slice(0, 500),
          metadata: { stratek_transaction: tx.id },
          successRedirectUrl: `${origin}/paid`,
          failRedirectUrl: `${origin}/paid`,
        });
        await store.put(`tx:${tx.id}`, { checkoutId: c.id, amount: c.amount, currency: c.currency });
        return { type: 'qr', title: `Pay with crypto -- ${c.currency} ${c.amount}`, text: 'Customer scans this to pay with crypto. Then use "Check crypto payment" on the sale.', qrPayload: c.url };
      },
    },
    {
      id: 'check', label: 'Check crypto payment', placement: ['transaction'], fields: [],
      async run({ env, context, store }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved) return { type: 'message', title: 'No crypto payment', text: 'No Coinbase payment was started for this sale.' };
        const c = await cb(env, 'GET', `/api/v1/checkouts/${encodeURIComponent(saved.checkoutId)}`);
        const paid = c.status === 'COMPLETED';
        return { type: 'status', title: 'Coinbase', status: STATUS[c.status] || c.status, text: paid ? `Paid${c.transactionHash ? ` (tx ${String(c.transactionHash).slice(0, 12)}...)` : ''}. Now press Settle on this sale.` : 'Not paid yet.' };
      },
    },
    {
      id: 'refund', label: 'Refund crypto payment', placement: ['transaction'],
      fields: [{ name: 'amount', label: 'Amount to refund (empty = all)', type: 'number' }],
      async run({ env, context, store, fields }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved) throw new Error('No Coinbase payment was started for this sale.');
        const amount = fields.amount ? Number(fields.amount).toFixed(2) : saved.amount;
        const r = await cb(env, 'POST', `/api/v1/checkouts/${encodeURIComponent(saved.checkoutId)}/refund`, { amount: String(amount), currency: saved.currency, reason: 'Refund from Stratek POS' });
        return { type: 'status', title: 'Coinbase refund', status: r?.refund?.status || r?.checkout?.status || 'Requested', text: `Refund of ${saved.currency} ${amount} requested.` };
      },
    },
  ],
};
