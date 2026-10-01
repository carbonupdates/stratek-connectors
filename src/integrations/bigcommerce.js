// bigcommerce -- keep a BigCommerce store in step with your Stratek inventory, and see its
// latest orders. BigCommerce admin -> Settings -> Store-level API accounts -> Create API account
// (Products: modify, Orders: read-only). Copy the access token and the store hash (the part
// after /stores/ in the API path).
//   API: https://api.bigcommerce.com/stores/{hash} (header X-Auth-Token)
//        GET /v2/store, POST|PUT /v3/catalog/products, GET /v2/orders
// Buttons (Integrations tab): Test BigCommerce, Sync inventory to BigCommerce, Latest BigCommerce orders.

import { syncItems, syncSummary, menuItems } from './_sync.js';
import { readJson } from './_ship.js';

const hash = (env) => { const h = String(env.BIGCOMMERCE_STORE_HASH || '').trim().replace(/^stores\//, ''); if (!/^[a-z0-9]{5,20}$/i.test(h)) throw new Error('BigCommerce: the store hash looks like abc123xyz (from the API path /stores/abc123xyz/).'); return h; };

async function bc(env, method, path, body) {
  const res = await fetch(`https://api.bigcommerce.com/stores/${hash(env)}${path}`, { method, headers: { 'X-Auth-Token': String(env.BIGCOMMERCE_ACCESS_TOKEN).trim(), Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 401) throw new Error('BigCommerce did not accept the access token.');
  if (res.status === 403) throw new Error('BigCommerce: the API account needs Products "modify" and Orders "read-only".');
  if (!res.ok) throw new Error(`BigCommerce: ${j?.title || j?.[0]?.message || `error ${res.status}`}${j?.errors ? ` (${Object.values(j.errors).join('; ').slice(0, 150)})` : ''}`);
  return j || {};
}

const product = (i, withType) => ({
  name: String(i.name).slice(0, 250), price: Number(i.price), sku: String(i.sku || `stratek-${i.id}`).slice(0, 255),
  description: i.description ? `<p>${String(i.description).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</p>` : '',
  is_visible: !!i.available, availability: i.available ? 'available' : 'disabled',
  ...(withType ? { type: 'physical', weight: 0, ...(i.photo ? { images: [{ image_url: i.photo, is_thumbnail: true }] } : {}) } : {}),
});

export default {
  id: 'bigcommerce',
  name: 'BigCommerce',
  category: 'commerce',
  status: 'available',
  color: '#121118',
  description: 'Keep a BigCommerce store in step with your Stratek inventory, and see its latest orders.',
  docsUrl: 'https://developer.bigcommerce.com/docs/rest-catalog/products',
  test: { support: 'none', note: 'Use a BigCommerce trial / sandbox store to try it.' },
  secrets: [
    { name: 'BIGCOMMERCE_STORE_HASH', label: 'Store hash', hint: 'Settings -> Store-level API accounts -> the API path https://api.bigcommerce.com/stores/<hash>/v3/.' },
    { name: 'BIGCOMMERCE_ACCESS_TOKEN', label: 'Access token', hint: 'Same page -> Create API account (Products: modify, Orders: read-only).' },
  ],
  actions: [
    {
      id: 'test', label: 'Test BigCommerce', placement: ['settings'], fields: [],
      async run({ env }) {
        const s = await bc(env, 'GET', '/v2/store');
        return { type: 'message', title: 'BigCommerce is connected', text: `Store "${s.name}" (${s.currency || '?'}).` };
      },
    },
    {
      id: 'sync_menu', label: 'Sync inventory to BigCommerce', placement: ['settings'], context: ['menu'], fields: [],
      async run({ env, store, context }) {
        const r = await syncItems(store, menuItems(context), async (i, remoteId) => {
          if (remoteId) { await bc(env, 'PUT', `/v3/catalog/products/${remoteId}`, product(i, false)); return remoteId; }
          return (await bc(env, 'POST', '/v3/catalog/products', product(i, true))).data.id;
        });
        return { type: 'message', title: 'BigCommerce sync', text: syncSummary('BigCommerce', r) };
      },
    },
    {
      id: 'orders', label: 'Latest BigCommerce orders', placement: ['settings'], fields: [],
      async run({ env }) {
        const j = await bc(env, 'GET', '/v2/orders?limit=5&sort=date_created:desc');
        const lines = (Array.isArray(j) ? j : []).map((o) => `#${o.id} ${o.status} ${o.currency_code} ${o.total_inc_tax}`);
        return { type: 'message', title: 'Latest BigCommerce orders', text: lines.length ? lines.join(' · ') : 'No orders yet.' };
      },
    },
  ],
};
