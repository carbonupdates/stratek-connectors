// pathao -- book and track Pathao courier deliveries for a sale (Nepal).
// Uses the Pathao Merchant (courier) API. Credentials: Pathao Merchant ->
// Developer API ("Merchant API Credentials"), which also shows the API base URL.
//
// Buttons
//   Test Pathao (Integrations tab)     get a token, list your Pathao stores (to find the store ID),
//                                      check the city list and a sample price quote
//   Send with Pathao (till, after Charge total; and sale details)  create a delivery order (cash to collect = sale total by default)
//   Track Pathao delivery (sale)       order status
//
// Hidden actions (placement 'delivery', never buttons) used by the online store:
//   cities, zones {cityId}, areas {zoneId}   Pathao's own location lists
//   quote {cityId, zoneId, weight}           Pathao's delivery price for this store
// Lists are cached for a day. Test keys = Pathao's sandbox (base URL + test credentials).
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

const listOf = (d) => { const x = d?.data?.data ?? d?.data ?? d; return Array.isArray(x) ? x : []; };
const posInt = (v, what) => { const n = Number(v); if (!Number.isInteger(n) || n <= 0) throw new Error(`Choose a ${what}.`); return n; };

async function cachedList(env, store, key, path, what) {
  const hit = await store.get(`list:${key}`);
  if (hit && hit.at > Date.now() - 86400000 && hit.base === base(env)) return hit.items;
  const items = listOf(await api(env, store, 'GET', path, null, what));
  await store.put(`list:${key}`, { at: Date.now(), base: base(env), items });
  return items;
}
export const cities = (env, store) => cachedList(env, store, 'cities', '/city-list', 'city list')
  .then((l) => l.map((c) => ({ id: Number(c.city_id ?? c.id), name: String(c.city_name ?? c.name ?? '') })).filter((c) => c.id));
export const zones = (env, store, cityId) => cachedList(env, store, `zones:${cityId}`, `/cities/${posInt(cityId, 'city')}/zone-list`, 'zone list')
  .then((l) => l.map((z) => ({ id: Number(z.zone_id ?? z.id), name: String(z.zone_name ?? z.name ?? '') })).filter((z) => z.id));
export const areas = (env, store, zoneId) => cachedList(env, store, `areas:${zoneId}`, `/zones/${posInt(zoneId, 'zone')}/area-list`, 'area list')
  .then((l) => l.map((a) => ({ id: Number(a.area_id ?? a.id), name: String(a.area_name ?? a.name ?? ''), homeDelivery: a.home_delivery_available !== false })).filter((a) => a.id));

/** Pathao's price for delivering to a city/zone from this store. Returns { price, currency }. */
export async function quote(env, store, { cityId, zoneId, weight }) {
  if (!env.PATHAO_STORE_ID) throw new Error('Add your Pathao store ID in Set up (press "Test Pathao" to see it).');
  const d = await api(env, store, 'POST', '/merchant/price-plan', {
    store_id: Number(env.PATHAO_STORE_ID),
    item_type: 2,
    delivery_type: 48,
    item_weight: Number(weight) > 0 ? Math.min(Number(weight), 25) : 0.5,
    recipient_city: posInt(cityId, 'city'),
    recipient_zone: posInt(zoneId, 'zone'),
  }, 'price');
  const p = d?.data || {};
  const price = Number(p.final_price ?? p.price);
  if (!Number.isFinite(price) || price < 0) throw new Error('Pathao did not return a delivery price for that address.');
  return { price: Math.round(price * 100) / 100, currency: 'NPR' };
}

export default {
  id: 'pathao',
  name: 'Pathao',
  category: 'delivery',
  status: 'available',
  color: '#e4202a',
  description: 'Book and track Pathao courier deliveries for a sale.',
  docsUrl: 'https://merchant.pathao.com/courier/developer-api',
  test: {
    support: 'sandbox',
    note: 'Use Pathao\'s sandbox (test) API address and test credentials. Test bookings go to Pathao\'s sandbox -- no rider is sent.',
    hints: { PATHAO_BASE_URL: 'Pathao sandbox API address (starts with https://), from Pathao\'s developer docs / test credentials.' },
  },
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
        if (!names) return { type: 'message', title: 'Pathao is connected', text: 'Signed in, but no stores were returned. Create a store in the Pathao merchant panel.' };
        // Online store readiness: city list + one sample price.
        let extra = '';
        try {
          const c = await cities(env, store);
          extra = ` City list: ${c.length} cities.`;
          if (env.PATHAO_STORE_ID && c.length) {
            const z = await zones(env, store, c[0].id);
            if (z.length) {
              const q = await quote(env, store, { cityId: c[0].id, zoneId: z[0].id, weight: 0.5 });
              extra += ` Sample price to ${c[0].name} / ${z[0].name}: Rs ${q.price} (live quotes work).`;
            }
          }
        } catch (err) { extra += ` Online-store check failed: ${err.message}`; }
        return { type: 'message', title: 'Pathao is connected', text: `Your stores: ${names}.${env.PATHAO_STORE_ID ? '' : ' Put the right store ID in Set up.'}${extra}` };
      },
    },
    {
      id: 'create_delivery',
      label: 'Send with Pathao',
      placement: ['charge', 'transaction'],
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
          ...(context?.delivery?.cityId ? { recipient_city: Number(context.delivery.cityId) } : {}),
          ...(context?.delivery?.zoneId ? { recipient_zone: Number(context.delivery.zoneId) } : {}),
          ...(context?.delivery?.areaId ? { recipient_area: Number(context.delivery.areaId) } : {}),
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
    { id: 'cities', label: 'Pathao cities', placement: ['delivery'], fields: [], async run({ env, store }) { return { type: 'list', items: await cities(env, store) }; } },
    { id: 'zones', label: 'Pathao zones', placement: ['delivery'], fields: [], async run({ env, store, context }) { return { type: 'list', items: await zones(env, store, context?.cityId) }; } },
    { id: 'areas', label: 'Pathao areas', placement: ['delivery'], fields: [], async run({ env, store, context }) { return { type: 'list', items: await areas(env, store, context?.zoneId) }; } },
    { id: 'quote', label: 'Pathao price', placement: ['delivery'], fields: [], async run({ env, store, context }) { return { type: 'quote', ...(await quote(env, store, context || {})) }; } },
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
