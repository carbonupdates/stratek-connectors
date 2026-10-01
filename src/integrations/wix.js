// wix -- keep a Wix Store in step with your Stratek inventory, and see its latest orders.
// Wix account -> API Keys Manager -> Generate API key (Wix Stores + eCommerce permissions,
// for your site); copy the site ID from the site's dashboard URL (/dashboard/<site-id>/).
// Uses Wix Stores Catalog V3 (all new stores; older V1 stores need Wix's catalog upgrade).
//   API: https://www.wixapis.com (headers Authorization: <API key>, wix-site-id)
//        POST /stores/v3/products-with-inventory, GET /stores/v3/products/{id},
//        PATCH /stores/v3/products-with-inventory/{id}, POST /ecom/v1/orders/search
// Buttons (Integrations tab): Test Wix, Sync inventory to Wix, Latest Wix orders.

import { syncItems, syncSummary, menuItems } from './_sync.js';
import { readJson } from './_ship.js';

async function wx(env, method, path, body) {
  const res = await fetch(`https://www.wixapis.com${path}`, { method, headers: { Authorization: String(env.WIX_API_KEY).trim(), 'wix-site-id': String(env.WIX_SITE_ID).trim(), Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 401 || res.status === 403) throw new Error('Wix did not accept the API key / site ID (the key needs Wix Stores and eCommerce permissions).');
  if (!res.ok) {
    const msg = j?.message || j?.details?.applicationError?.description || `error ${res.status}`;
    if (/catalog.?v1|CATALOG_V1|not.*v3/i.test(JSON.stringify(j || ''))) throw new Error('Wix: this store still uses the old catalog (V1). Upgrade the store catalog in Wix, then sync again.');
    throw new Error(`Wix: ${msg}`.slice(0, 300));
  }
  return j || {};
}

const money = (n) => ({ amount: Number(n).toFixed(2) });

export default {
  id: 'wix',
  name: 'Wix Stores',
  category: 'commerce',
  status: 'available',
  color: '#0C6EFC',
  description: 'Keep a Wix Store in step with your Stratek inventory, and see its latest orders.',
  docsUrl: 'https://dev.wix.com/docs/rest/business-solutions/stores/catalog-v3/products-v3/introduction',
  test: { support: 'none', note: 'Use a test Wix site to try it.' },
  secrets: [
    { name: 'WIX_API_KEY', label: 'Wix API key', hint: 'Wix -> API Keys Manager -> Generate (permissions: Wix Stores, eCommerce).' },
    { name: 'WIX_SITE_ID', label: 'Site ID', hint: 'From the site dashboard address: manage.wix.com/dashboard/<site-id>/...' },
  ],
  actions: [
    {
      id: 'test', label: 'Test Wix', placement: ['settings'], fields: [],
      async run({ env }) {
        const j = await wx(env, 'POST', '/stores/v3/products/query', { query: { cursorPaging: { limit: 1 } } });
        return { type: 'message', title: 'Wix is connected', text: `Store catalog reachable${j.pagingMetadata?.count !== undefined ? ` (${j.pagingMetadata.count} product${j.pagingMetadata.count === 1 ? '' : 's'} on the first page)` : ''}.` };
      },
    },
    {
      id: 'sync_menu', label: 'Sync inventory to Wix', placement: ['settings'], context: ['menu'], fields: [],
      async run({ env, store, context }) {
        const r = await syncItems(store, menuItems(context), async (i, remoteId) => {
          const sku = String(i.sku || `stratek-${i.id}`).slice(0, 40);
          if (remoteId) {
            const cur = (await wx(env, 'GET', `/stores/v3/products/${encodeURIComponent(remoteId)}?fields=VARIANT_OPTION_CHOICE_NAMES`)).product || {};
            const vid = cur.variantsInfo?.variants?.[0]?.id;
            await wx(env, 'PATCH', `/stores/v3/products-with-inventory/${encodeURIComponent(remoteId)}`, { product: { id: remoteId, revision: cur.revision, name: String(i.name).slice(0, 80), visible: !!i.available, ...(vid ? { variantsInfo: { variants: [{ id: vid, sku, price: { actualPrice: money(i.price) }, inventoryItem: { inStock: !!i.available } }] } } : {}) } });
            return remoteId;
          }
          const c = await wx(env, 'POST', '/stores/v3/products-with-inventory', { product: {
            name: String(i.name).slice(0, 80), productType: 'PHYSICAL', physicalProperties: {}, visible: !!i.available,
            ...(i.description ? { plainDescription: String(i.description).slice(0, 8000) } : {}),
            ...(i.photo ? { media: { itemsInfo: { items: [{ url: i.photo }] } } } : {}),
            variantsInfo: { variants: [{ sku, price: { actualPrice: money(i.price) }, inventoryItem: { inStock: !!i.available } }] },
          } });
          return c.product?.id;
        });
        return { type: 'message', title: 'Wix sync', text: syncSummary('Wix', r) };
      },
    },
    {
      id: 'orders', label: 'Latest Wix orders', placement: ['settings'], fields: [],
      async run({ env }) {
        const j = await wx(env, 'POST', '/ecom/v1/orders/search', { search: { sort: [{ fieldName: 'createdDate', order: 'DESC' }], cursorPaging: { limit: 5 } } });
        const lines = (j.orders || []).map((o) => `#${o.number} ${o.paymentStatus || ''} ${o.priceSummary?.total?.formattedAmount || o.priceSummary?.total?.amount || ''}`);
        return { type: 'message', title: 'Latest Wix orders', text: lines.length ? lines.join(' · ') : 'No orders yet.' };
      },
    },
  ],
};
