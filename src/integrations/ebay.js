// ebay -- keep eBay inventory in step with your Stratek items, and see the latest eBay orders.
// developer.ebay.com -> your app keys (Client ID / Client Secret) -> User Tokens ->
// "Get a Token from eBay via Your Application" -> sign in as the seller -> copy the refresh
// token (valid ~18 months). Scopes: sell.inventory, sell.fulfillment.readonly.
// Items are eBay inventory items keyed by SKU (the Stratek item SKU, else stratek-<id>).
// Publish each one once in Seller Hub (policies, category); after that "Sync" keeps the
// title, description, photo, stock and -- if you set a price factor -- the price in step.
//   Token: POST https://api.ebay.com/identity/v1/oauth2/token (refresh_token, basic client:secret)
//   API:   PUT /sell/inventory/v1/inventory_item/{sku}, GET /sell/inventory/v1/offer?sku=,
//          POST /sell/inventory/v1/bulk_update_price_quantity, GET /sell/fulfillment/v1/order
//   Test mode: the same on api.sandbox.ebay.com with sandbox keys.
// Buttons (Integrations tab): Test eBay, Sync inventory to eBay, Latest eBay orders.

import { syncItems, syncSummary, menuItems } from './_sync.js';
import { readJson, cachedToken } from './_ship.js';

const host = (mode) => (mode === 'test' ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com');
const SCOPES = 'https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly';

async function token(env, store, mode) {
  return cachedToken(store, `token:${mode}`, async () => {
    const res = await fetch(`${host(mode)}/identity/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${btoa(`${String(env.EBAY_CLIENT_ID).trim()}:${String(env.EBAY_CLIENT_SECRET).trim()}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: String(env.EBAY_REFRESH_TOKEN).trim(), scope: SCOPES }) });
    const j = await readJson(res);
    if (!res.ok || !j?.access_token) throw new Error(`eBay refused the refresh token: ${j?.error_description || j?.error || `error ${res.status}`} (get a new one in the developer portal; sandbox and production are different).`);
    return { token: j.access_token, expiresIn: j.expires_in };
  });
}

async function eb(env, store, mode, method, path, body, { allow404 = false } = {}) {
  const res = await fetch(`${host(mode)}${path}`, { method, headers: { Authorization: `Bearer ${await token(env, store, mode)}`, Accept: 'application/json', 'Content-Language': 'en-US', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (allow404 && res.status === 404) return null;
  const j = await readJson(res);
  if (!res.ok) throw new Error(`eBay: ${(j?.errors || []).map((e) => e.longMessage || e.message).join('; ') || `error ${res.status}`}`.slice(0, 300));
  return j || {};
}

export const skuOf = (i) => String(i.sku || `stratek-${i.id}`).slice(0, 50);
const factor = (env) => { const f = Number(env.EBAY_PRICE_FACTOR); return Number.isFinite(f) && f > 0 ? f : null; };

export default {
  id: 'ebay',
  name: 'eBay',
  category: 'commerce',
  status: 'available',
  color: '#0064D2',
  description: 'Keep eBay inventory (details, stock, price) in step with Stratek, and see the latest eBay orders.',
  docsUrl: 'https://developer.ebay.com/api-docs/sell/inventory/overview.html',
  test: { support: 'sandbox', note: 'Save sandbox app keys and a sandbox refresh token under Test keys.' },
  secrets: [
    { name: 'EBAY_CLIENT_ID', label: 'eBay app Client ID', hint: 'developer.ebay.com -> Application keys (Production, or Sandbox under Test keys).' },
    { name: 'EBAY_CLIENT_SECRET', label: 'eBay app Client Secret' },
    { name: 'EBAY_REFRESH_TOKEN', label: 'Seller refresh token', hint: 'User Tokens -> Get a Token from eBay via Your Application -> sign in as the seller.' },
    { name: 'EBAY_DEFAULT_QUANTITY', label: 'Stock to show for available items', hint: 'Optional, default 10 (unavailable items get 0).', optional: true },
    { name: 'EBAY_PRICE_FACTOR', label: 'Price factor (Stratek price x factor = eBay price)', hint: 'Optional. e.g. 0.0075 turns NPR into USD. Empty = prices are not changed on eBay.', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test eBay', placement: ['settings'], fields: [],
      async run({ env, store, mode }) {
        const j = await eb(env, store, mode, 'GET', '/sell/inventory/v1/inventory_item?limit=1');
        return { type: 'message', title: 'eBay is connected', text: `${j.total ?? 0} inventory item${j.total === 1 ? '' : 's'} on eBay${mode === 'test' ? ' (sandbox)' : ''}.` };
      },
    },
    {
      id: 'sync_listings', label: 'Sync inventory to eBay', placement: ['settings'], context: ['menu'], fields: [],
      async run({ env, store, mode, context }) {
        const qty = Math.max(0, Math.round(Number(env.EBAY_DEFAULT_QUANTITY || 10)));
        const f = factor(env);
        const prices = [];
        const r = await syncItems(store, menuItems(context), async (i) => {
          const sku = skuOf(i);
          await eb(env, store, mode, 'PUT', `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
            condition: 'NEW', availability: { shipToLocationAvailability: { quantity: i.available ? qty : 0 } },
            product: { title: String(i.name).slice(0, 80), ...(i.description ? { description: String(i.description).slice(0, 4000) } : {}), ...(i.photo ? { imageUrls: [i.photo] } : {}) },
          });
          if (f) {
            const o = await eb(env, store, mode, 'GET', `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}`, null, { allow404: true });
            const offer = o?.offers?.[0];
            if (offer) prices.push({ sku, offers: [{ offerId: offer.offerId, availableQuantity: i.available ? qty : 0, price: { currency: offer.pricingSummary?.price?.currency || 'USD', value: (Number(i.price) * f).toFixed(2) } }] });
          }
          return sku;
        });
        for (let n = 0; n < prices.length; n += 25) await eb(env, store, mode, 'POST', '/sell/inventory/v1/bulk_update_price_quantity', { requests: prices.slice(n, n + 25) });
        return { type: 'message', title: 'eBay sync', text: `${syncSummary('eBay', r)}${f ? ` Prices updated on ${prices.length} published listing${prices.length === 1 ? '' : 's'}.` : ' Prices unchanged (no price factor set).'} New items: publish them once in Seller Hub.` };
      },
    },
    {
      id: 'orders', label: 'Latest eBay orders', placement: ['settings'], fields: [],
      async run({ env, store, mode }) {
        const j = await eb(env, store, mode, 'GET', '/sell/fulfillment/v1/order?limit=5');
        const lines = (j.orders || []).map((o) => `${o.orderId} ${o.orderFulfillmentStatus || ''} ${o.pricingSummary?.total?.currency || ''} ${o.pricingSummary?.total?.value || ''} (${o.buyer?.username || 'buyer'})`);
        return { type: 'message', title: 'Latest eBay orders', text: lines.length ? lines.join(' · ') : 'No orders yet.' };
      },
    },
  ],
};
