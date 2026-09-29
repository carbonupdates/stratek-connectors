// pathao -- book and track Pathao courier deliveries for a sale (Nepal).
// Uses the Pathao Merchant (courier) API. Credentials: Pathao Merchant ->
// Developer API ("Merchant API Credentials"), which also shows the API base URL.
//
// Buttons
//   Test Pathao (Integrations tab)     get a token, list your Pathao stores (to find the store ID)
//   Send with Pathao (sale details)    create a delivery order (cash to collect = sale total by default)
//   Track Pathao delivery (sale)       order status
//
// The access token is cached in the connector and renewed when it expires.

const P = '/aladdin/api/v1';

function base(env) {
  const b = String(env.PATHAO_BASE_URL || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\//.test(b)) throw new Error('Set the Pathao API base URL (https://...) in Set up -- it is shown on Pathao Merchant -> Developer API.');
  return b;
}

async function call(url, opts, what) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const errs = data?.errors ? Object.values(data.errors).flat().join(' ') : '';
    throw new Error(`Pathao ${what}: ${data?.message || `error ${res.status}`}${errs ? ` (${errs})` : ''}`);
  }
  return data;
}

async function token(env, store) {
  const cached = await store.get('token');
  if (cached?.access_token && cached.expiresAt > Date.now() + 60000 && cached.base === base(env) && cached.clientId === env.PATHAO_CLIENT_ID) return cached.access_token;
  const d = await call(`${base(env)}${P}/issue-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: env.PATHAO_CLIENT_ID, client_secret: env.PATHAO_CLIENT_SECRET, username: env.PATHAO_USERNAME, password: env.PATHAO_PASSWORD, grant_type: 'password' }),
  }, 'sign-in');
  if (!d?.access_token) throw new Error('Pathao sign-in did not return a token. Check the credentials in Set up.');
  await store.put('token', { access_token: d.access_token, expiresAt: Date.now() + (Number(d.expires_in) || 3600) * 1000, base: base(env), clientId: env.PATHAO_CLIENT_ID });
  return d.access_token;
}

async function api(env, store, method, path, body, what) {
  const t = await token(env, store);
  return call(`${base(env)}${P}${path}`, {
    method,
    headers: { Authorization: `Bearer ${t}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }, what);
}

export default {
  id: 'pathao',
  name: 'Pathao',
  category: 'delivery',
  status: 'available',
  description: 'Book and track Pathao courier deliveries for a sale.',
  docsUrl: 'https://merchant.pathao.com/courier/developer-api',
  secrets: [
    { name: 'PATHAO_BASE_URL', label: 'Pathao API base URL', hint: 'Shown on Pathao Merchant -> Developer API (starts with https://).' },
    { name: 'PATHAO_CLIENT_ID', label: 'Client ID', hint: 'Pathao Merchant -> Developer API -> Merchant API Credentials.' },
    { name: 'PATHAO_CLIENT_SECRET', label: 'Client secret' },
    { name: 'PATHAO_USERNAME', label: 'Pathao merchant login email' },
    { name: 'PATHAO_PASSWORD', label: 'Pathao merchant password' },
    { name: 'PATHAO_STORE_ID', label: 'Store ID', hint: 'Press "Test Pathao" on the Integrations tab after saving the other keys to see your store IDs.', optional: true },
  ],
  actions: [
    {
      id: 'test',
      label: 'Test Pathao',
      placement: ['settings'],
      fields: [],
      async run({ env, store }) {
        const d = await api(env, store, 'GET', '/stores', null, 'stores');
        const list = d?.data?.data || d?.data || [];
        const names = Array.isArray(list) ? list.map((s) => `${s.store_name || s.name} (ID ${s.store_id || s.id})`).join(', ') : '';
        return { type: 'message', title: 'Pathao is connected', text: names ? `Your stores: ${names}.${env.PATHAO_STORE_ID ? '' : ' Put the right store ID in Set up.'}` : 'Signed in, but no stores were returned. Create a store in the Pathao merchant panel.' };
      },
    },
    {
      id: 'create_delivery',
      label: 'Send with Pathao',
      placement: ['transaction'],
      fields: [
        { name: 'recipientName', label: 'Recipient name', type: 'text', required: true },
        { name: 'recipientPhone', label: 'Recipient phone', type: 'tel', required: true },
        { name: 'recipientAddress', label: 'Delivery address', type: 'text', required: true },
        { name: 'codAmount', label: 'Cash to collect (0 if paid)', type: 'number', required: true, default: 0 },
        { name: 'itemWeight', label: 'Weight (kg)', type: 'number', default: 0.5 },
        { name: 'note', label: 'Note for rider', type: 'text' },
      ],
      async run({ env, store, fields, context }) {
        const tx = context?.transaction || {};
        if (!tx.id) throw new Error('Open this from a sale.');
        if (!env.PATHAO_STORE_ID) throw new Error('Add your Pathao store ID in Set up (press "Test Pathao" to see it).');
        const existing = await store.get(`tx:${tx.id}`);
        if (existing?.consignmentId) return { type: 'status', title: 'Pathao', status: 'Already booked', text: `Consignment ${existing.consignmentId}. Use "Track Pathao delivery".` };
        const items = Array.isArray(tx.items) ? tx.items : [];
        const d = await api(env, store, 'POST', '/orders', {
          store_id: Number(env.PATHAO_STORE_ID),
          merchant_order_id: `STK-${tx.id}`,
          recipient_name: String(fields.recipientName).slice(0, 100),
          recipient_phone: String(fields.recipientPhone).replace(/[^\d+]/g, ''),
          recipient_address: String(fields.recipientAddress).slice(0, 220),
          delivery_type: 48,
          item_type: 2,
          item_quantity: Math.max(1, items.reduce((n, i) => n + (Number(i.qty) || 1), 0)),
          item_weight: Number(fields.itemWeight) > 0 ? Number(fields.itemWeight) : 0.5,
          amount_to_collect: Math.max(0, Math.round(Number(fields.codAmount) || 0)),
          item_description: items.map((i) => `${i.qty || 1} x ${i.name}`).join(', ').slice(0, 250) || `Sale ${tx.reference || tx.id}`,
          special_instruction: fields.note ? String(fields.note).slice(0, 250) : undefined,
        }, 'order');
        const o = d?.data || {};
        await store.put(`tx:${tx.id}`, { consignmentId: o.consignment_id, bookedAt: new Date().toISOString() });
        return { type: 'status', title: 'Pathao delivery booked', status: o.order_status || 'Pending', text: `Consignment ${o.consignment_id}${o.delivery_fee !== undefined ? `, delivery fee Rs ${o.delivery_fee}` : ''}.` };
      },
    },
    {
      id: 'track',
      label: 'Track Pathao delivery',
      placement: ['transaction'],
      fields: [],
      async run({ env, store, context }) {
        const id = context?.transaction?.id;
        const saved = id && (await store.get(`tx:${id}`));
        if (!saved?.consignmentId) return { type: 'message', title: 'Not booked', text: 'No Pathao delivery was booked for this sale.' };
        const d = await api(env, store, 'GET', `/orders/${encodeURIComponent(saved.consignmentId)}/info`, null, 'tracking');
        const o = d?.data || {};
        return { type: 'status', title: `Pathao ${saved.consignmentId}`, status: o.order_status || o.order_status_slug || 'Unknown', text: o.updated_at ? `Last update ${o.updated_at}.` : '' };
      },
    },
  ],
};
