// meta_catalog -- keep a Facebook / Instagram Shop catalogue in step with the
// Stratek menu (Catalog Batch API).
// Docs: https://developers.facebook.com/docs/marketing-api/catalog-batch/
//
// Buttons (Integrations tab)
//   Test Meta Catalog        reads the catalogue name and product count
//   Sync menu to Facebook/Instagram Shop
//                            upserts every menu item that has a photo (Meta requires an
//                            image); items marked unavailable are "out of stock".
// Stratek sends the menu with the request (the connector can't read Stratek on its own).

import { toMinor } from './_util.js';

const graph = (env) => `https://graph.facebook.com/${String(env.META_GRAPH_VERSION || 'v23.0').trim()}`;

async function meta(env, method, path, body) {
  const url = new URL(graph(env) + path);
  url.searchParams.set('access_token', env.META_SYSTEM_USER_TOKEN);
  const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Meta: ${data?.error?.error_user_msg || data?.error?.message || `error ${res.status}`}`);
  return data;
}

export default {
  id: 'meta_catalog',
  name: 'Meta Catalog (Facebook & Instagram Shop)',
  category: 'commerce',
  status: 'available',
  description: 'Keep a Facebook/Instagram shop catalogue in step with the POS menu.',
  docsUrl: 'https://developers.facebook.com/docs/marketing-api/catalog-batch/',
  secrets: [
    { name: 'META_CATALOG_ID', label: 'Catalog ID', hint: 'Commerce Manager -> your catalogue -> Settings.' },
    { name: 'META_SYSTEM_USER_TOKEN', label: 'System user access token', hint: 'Business Settings -> System users -> Generate token with catalog_management.' },
    { name: 'META_SHOP_URL', label: 'Shop web address', hint: 'Link shown on each product (e.g. your website or Instagram). Leave empty to use Stratek.', optional: true },
    { name: 'META_GRAPH_VERSION', label: 'Graph API version', hint: 'Leave empty for v23.0.', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test Meta Catalog', placement: ['settings'], fields: [],
      async run({ env }) {
        const d = await meta(env, 'GET', `/${encodeURIComponent(env.META_CATALOG_ID)}?fields=name,product_count`);
        return { type: 'message', title: 'Meta Catalog is connected', text: `Catalogue "${d.name}" has ${d.product_count ?? '?'} products.` };
      },
    },
    {
      id: 'sync_menu', label: 'Sync menu to Facebook/Instagram Shop', placement: ['settings'], fields: [],
      context: ['menu'], // Stratek sends { menu: { currency, items: [...] } }
      async run({ env, context, claims }) {
        const menu = context?.menu;
        if (!menu || !Array.isArray(menu.items)) throw new Error('Run this from a shop\'s Integrations tab (it needs the shop\'s menu).');
        const currency = String(menu.currency || 'NPR').toUpperCase();
        const link = env.META_SHOP_URL || claims.iss || 'https://strateknepal.com';
        const withPhoto = menu.items.filter((i) => /^https:\/\//.test(i.photo || ''));
        if (!withPhoto.length) throw new Error('None of your menu items has a photo -- Meta needs one per product.');
        const requests = withPhoto.slice(0, 5000).map((i) => ({
          method: 'UPDATE',
          retailer_id: `stratek-${i.id}`,
          data: {
            name: String(i.name).slice(0, 150),
            description: String(i.description || i.name).slice(0, 5000),
            price: toMinor(i.price, currency),
            currency,
            availability: i.available === false ? 'out of stock' : 'in stock',
            condition: 'new',
            image_url: i.photo,
            url: link,
            ...(i.category ? { category: String(i.category).slice(0, 250) } : {}),
          },
        }));
        let sent = 0;
        for (let k = 0; k < requests.length; k += 1000) {
          await meta(env, 'POST', `/${encodeURIComponent(env.META_CATALOG_ID)}/batch`, { allow_upsert: true, requests: requests.slice(k, k + 1000) });
          sent += Math.min(1000, requests.length - k);
        }
        const skipped = menu.items.length - withPhoto.length;
        return { type: 'message', title: 'Menu sent to Meta', text: `${sent} product(s) sent${skipped ? `; ${skipped} skipped (no photo)` : ''}. Meta processes them in a few minutes -- check Commerce Manager.` };
      },
    },
  ],
};
