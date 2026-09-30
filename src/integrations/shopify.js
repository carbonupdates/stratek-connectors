// shopify -- keep a Shopify store in step with your Stratek inventory, and see its
// latest orders. Shopify admin -> Settings -> Apps -> Develop apps -> create an app,
// give it the Admin API scopes write_products and read_orders, install it, and copy
// the Admin API access token.
//   API: https://<shop>.myshopify.com/admin/api/2025-07/{shop,products,orders}.json
//        (header X-Shopify-Access-Token)
// Buttons (Integrations tab): Test Shopify, Sync inventory to Shopify, Latest Shopify orders.

import { syncItems, syncSummary, menuItems } from './_sync.js';

const VERSION = '2025-07';
function shop(env) {
  const d = String(env.SHOPIFY_STORE_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(d)) throw new Error('Shopify: use your store\'s myshopify.com address, e.g. chyau.myshopify.com.');
  return d;
}

async function sh(env, method, path, body) {
  const res = await fetch(`https://${shop(env)}/admin/api/${VERSION}${path}`, { method, headers: { 'X-Shopify-Access-Token': String(env.SHOPIFY_ACCESS_TOKEN).trim(), Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => null);
  if (res.status === 401) throw new Error('Shopify did not accept the Admin API access token.');
  if (res.status === 403) throw new Error('Shopify: the app needs the scopes write_products and read_orders.');
  if (!res.ok) throw new Error(`Shopify: ${typeof j?.errors === 'string' ? j.errors : JSON.stringify(j?.errors || '') || `error ${res.status}`}`);
  return j;
}

const product = (i, remote) => ({
  product: {
    ...(remote ? { id: remote } : {}),
    title: i.name, body_html: i.description ? String(i.description).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])) : '',
    product_type: i.category || '', status: i.available ? 'active' : 'draft', tags: 'Stratek',
    ...(remote ? {} : { variants: [{ price: Number(i.price).toFixed(2), sku: `stratek-${i.id}` }] }),
    ...(i.photo && !remote ? { images: [{ src: i.photo }] } : {}),
  },
});

export default {
  id: 'shopify',
  name: 'Shopify',
  category: 'commerce',
  status: 'available',
  description: 'Keep a Shopify store in step with your Stratek inventory, and see its latest orders.',
  docsUrl: 'https://shopify.dev/docs/api/admin-rest',
  test: { support: 'none', note: 'Use a Shopify development store to try it.' },
  secrets: [
    { name: 'SHOPIFY_STORE_DOMAIN', label: 'Store address', hint: 'yourshop.myshopify.com' },
    { name: 'SHOPIFY_ACCESS_TOKEN', label: 'Admin API access token', hint: 'Shopify admin -> Settings -> Apps -> Develop apps -> your app (scopes write_products, read_orders) -> Install -> Admin API access token.' },
  ],
  actions: [
    {
      id: 'test', label: 'Test Shopify', placement: ['settings'], fields: [],
      async run({ env }) {
        const s = await sh(env, 'GET', '/shop.json');
        return { type: 'message', title: 'Shopify is connected', text: `Store "${s.shop?.name}" (${s.shop?.currency}).` };
      },
    },
    {
      id: 'sync_menu', label: 'Sync inventory to Shopify', placement: ['settings'], context: ['menu'], fields: [],
      async run({ env, store, context }) {
        const r = await syncItems(store, menuItems(context), async (i, remoteId) => {
          if (remoteId) {
            const p = await sh(env, 'PUT', `/products/${remoteId}.json`, product(i, remoteId));
            const v = p.product?.variants?.[0];
            if (v && Number(v.price) !== Number(i.price)) await sh(env, 'PUT', `/variants/${v.id}.json`, { variant: { id: v.id, price: Number(i.price).toFixed(2) } });
            return remoteId;
          }
          return (await sh(env, 'POST', '/products.json', product(i, null))).product.id;
        });
        return { type: 'message', title: 'Shopify sync', text: syncSummary('Shopify', r) };
      },
    },
    {
      id: 'orders', label: 'Latest Shopify orders', placement: ['settings'], fields: [],
      async run({ env }) {
        const j = await sh(env, 'GET', '/orders.json?status=any&limit=5');
        const lines = (j.orders || []).map((o) => `${o.name} ${o.financial_status || ''} ${o.currency} ${o.total_price}`);
        return { type: 'message', title: 'Latest Shopify orders', text: lines.length ? lines.join(' · ') : 'No orders yet.' };
      },
    },
  ],
};
