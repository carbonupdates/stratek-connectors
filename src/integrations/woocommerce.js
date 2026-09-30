// woocommerce -- keep a WooCommerce store in step with your Stratek inventory, and see
// its latest orders. WooCommerce -> Settings -> Advanced -> REST API -> Add key
// (Read/Write). The store must use https.
//   API: <store>/wp-json/wc/v3/products, /orders  (basic auth consumer key:secret)
// Buttons (Integrations tab): Test WooCommerce, Sync inventory to WooCommerce, Latest WooCommerce orders.

import { syncItems, syncSummary, menuItems } from './_sync.js';

function base(env) {
  let u;
  try { u = new URL(String(env.WOO_STORE_URL || '').trim()); } catch { throw new Error('WooCommerce: paste your store address (https://yourshop.com) in Set up.'); }
  if (u.protocol !== 'https:') throw new Error('WooCommerce: the store address must use https://');
  return `${u.origin}${u.pathname.replace(/\/+$/, '')}/wp-json/wc/v3`;
}

async function woo(env, method, path, body) {
  const res = await fetch(`${base(env)}${path}`, { method, headers: { Authorization: `Basic ${btoa(`${String(env.WOO_CONSUMER_KEY).trim()}:${String(env.WOO_CONSUMER_SECRET).trim()}`)}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => null);
  if (res.status === 401 || res.status === 403) throw new Error('WooCommerce did not accept the consumer key / secret (they need Read/Write).');
  if (!res.ok) throw new Error(`WooCommerce: ${j?.message || `error ${res.status}`}`);
  return j;
}

const product = (i) => ({
  name: i.name, type: 'simple', regular_price: Number(i.price).toFixed(2), description: i.description || '',
  status: i.available ? 'publish' : 'draft', sku: `stratek-${i.id}`,
  ...(i.photo ? { images: [{ src: i.photo }] } : {}),
  meta_data: [{ key: '_stratek_item_id', value: String(i.id) }],
});

export default {
  id: 'woocommerce',
  name: 'WooCommerce',
  category: 'commerce',
  status: 'available',
  description: 'Keep a WooCommerce store in step with your Stratek inventory, and see its latest orders.',
  docsUrl: 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
  test: { support: 'none', note: 'Use a staging copy of your store to try it.' },
  secrets: [
    { name: 'WOO_STORE_URL', label: 'Store address', hint: 'https://yourshop.com (must be https).' },
    { name: 'WOO_CONSUMER_KEY', label: 'Consumer key', hint: 'WooCommerce -> Settings -> Advanced -> REST API -> Add key, permissions Read/Write.' },
    { name: 'WOO_CONSUMER_SECRET', label: 'Consumer secret' },
  ],
  actions: [
    {
      id: 'test', label: 'Test WooCommerce', placement: ['settings'], fields: [],
      async run({ env }) {
        const p = await woo(env, 'GET', '/products?per_page=1');
        return { type: 'message', title: 'WooCommerce is connected', text: `The store answered (${Array.isArray(p) && p.length ? 'products found' : 'no products yet'}).` };
      },
    },
    {
      id: 'sync_menu', label: 'Sync inventory to WooCommerce', placement: ['settings'], context: ['menu'], fields: [],
      async run({ env, store, context }) {
        const r = await syncItems(store, menuItems(context), async (i, remoteId) => {
          if (remoteId) { await woo(env, 'PUT', `/products/${remoteId}`, product(i)); return remoteId; }
          const found = await woo(env, 'GET', `/products?sku=${encodeURIComponent(`stratek-${i.id}`)}`);
          if (Array.isArray(found) && found[0]?.id) { await woo(env, 'PUT', `/products/${found[0].id}`, product(i)); return found[0].id; }
          return (await woo(env, 'POST', '/products', product(i))).id;
        });
        return { type: 'message', title: 'WooCommerce sync', text: syncSummary('WooCommerce', r) };
      },
    },
    {
      id: 'orders', label: 'Latest WooCommerce orders', placement: ['settings'], fields: [],
      async run({ env }) {
        const list = await woo(env, 'GET', '/orders?per_page=5&orderby=date&order=desc');
        const lines = (list || []).map((o) => `#${o.number} ${o.status} ${o.currency} ${o.total} -- ${[o.billing?.first_name, o.billing?.last_name].filter(Boolean).join(' ') || 'guest'}`);
        return { type: 'message', title: 'Latest WooCommerce orders', text: lines.length ? lines.join(' · ') : 'No orders yet.' };
      },
    },
  ],
};
