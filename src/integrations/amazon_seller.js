// amazon_seller -- keep your Amazon listings' stock (and, if you want, price) in step with
// Stratek, and see the latest Amazon orders. Needs an Amazon seller account and a private
// SP-API app (Seller Central -> Apps and services -> Develop apps; roles: Product Listing,
// Inventory and Order Tracking). Authorise it for your own account to get the refresh token.
// Listings are matched by seller SKU (the Stratek item SKU, else stratek-<id>); a SKU must
// already be listed on Amazon -- this updates it, it does not create new listings.
//   Token: POST https://api.amazon.com/auth/o2/token (refresh_token grant)
//   API:   https://sellingpartnerapi-{na|eu|fe}.amazon.com (test: sandbox.sellingpartnerapi-...)
//          PATCH /listings/2021-08-01/items/{sellerId}/{sku}?marketplaceIds=, GET /orders/v0/orders
// Buttons (Integrations tab): Test Amazon Seller, Sync stock to Amazon, Latest Amazon orders.

import { syncItems, syncSummary, menuItems } from './_sync.js';
import { readJson, cachedToken } from './_ship.js';

const HOSTS = { na: 'sellingpartnerapi-na.amazon.com', eu: 'sellingpartnerapi-eu.amazon.com', fe: 'sellingpartnerapi-fe.amazon.com' };
const region = (env) => { const r = String(env.AMAZON_SELLER_REGION || 'na').trim().toLowerCase(); if (!HOSTS[r]) throw new Error('Amazon region must be na, eu or fe.'); return r; };
const base = (env, mode) => `https://${mode === 'test' ? 'sandbox.' : ''}${HOSTS[region(env)]}`;
const mkt = (env) => String(env.AMAZON_SELLER_MARKETPLACE_ID || '').trim();
const skuOf = (i) => String(i.sku || `stratek-${i.id}`).slice(0, 40);

async function lwa(env, store, mode) {
  return cachedToken(store, `token:${mode}`, async () => {
    const res = await fetch('https://api.amazon.com/auth/o2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: String(env.AMAZON_SELLER_REFRESH_TOKEN).trim(), client_id: String(env.AMAZON_SELLER_LWA_CLIENT_ID).trim(), client_secret: String(env.AMAZON_SELLER_LWA_CLIENT_SECRET).trim() }) });
    const j = await readJson(res);
    if (!res.ok || !j?.access_token) throw new Error(`Amazon (Login with Amazon): ${j?.error_description || 'the client ID / secret / refresh token were refused'}.`);
    return { token: j.access_token, expiresIn: j.expires_in };
  });
}

async function sp(env, store, mode, method, path, body) {
  const res = await fetch(`${base(env, mode)}${path}`, { method, headers: { 'x-amz-access-token': await lwa(env, store, mode), Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 403) throw new Error('Amazon: access denied -- the app needs the Product Listing and Inventory and Order Tracking roles.');
  if (!res.ok) throw new Error(`Amazon: ${(j?.errors || []).map((e) => e.message).join('; ') || `error ${res.status}`}`);
  return j?.payload ?? j;
}

export default {
  id: 'amazon_seller',
  name: 'Amazon Seller',
  category: 'commerce',
  status: 'available',
  color: '#FF9900',
  description: 'Keep your Amazon listings\' stock (and price) in step with Stratek, and see the latest Amazon orders.',
  docsUrl: 'https://developer-docs.amazon.com/sp-api/docs/listings-items-api-v2021-08-01-reference',
  test: { support: 'sandbox', note: 'Test mode calls the SP-API sandbox, which returns sample answers; nothing changes on Amazon.' },
  secrets: [
    { name: 'AMAZON_SELLER_LWA_CLIENT_ID', label: 'Login with Amazon client ID', hint: 'Seller Central -> Apps and services -> Develop apps -> your app (roles: Product Listing; Inventory and Order Tracking).' },
    { name: 'AMAZON_SELLER_LWA_CLIENT_SECRET', label: 'Login with Amazon client secret' },
    { name: 'AMAZON_SELLER_REFRESH_TOKEN', label: 'Selling Partner refresh token', hint: 'Develop apps -> your app -> Authorise -> copy the refresh token (Atzr|...).' },
    { name: 'AMAZON_SELLER_ID', label: 'Seller ID (merchant token)', hint: 'Seller Central -> Settings -> Account info -> Merchant token.' },
    { name: 'AMAZON_SELLER_MARKETPLACE_ID', label: 'Marketplace ID', hint: 'e.g. ATVPDKIKX0DER (US), A21TJRUUN4KGV (India), A1F83G8C2ARO7P (UK).' },
    { name: 'AMAZON_SELLER_REGION', label: 'SP-API region (na, eu, fe)', hint: 'Optional, default na. India and UK are eu.', optional: true },
    { name: 'AMAZON_SELLER_QUANTITY', label: 'Stock to show for available items', hint: 'Optional, default 10 (unavailable items get 0). Only for listings you ship yourself.', optional: true },
    { name: 'AMAZON_SELLER_PRICE_FACTOR', label: 'Price factor (Stratek price x factor = Amazon price)', hint: 'Optional. Empty = prices are not changed on Amazon.', optional: true },
    { name: 'AMAZON_SELLER_CURRENCY', label: 'Marketplace currency', hint: 'Needed with a price factor, e.g. USD, INR, GBP.', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test Amazon Seller', placement: ['settings'], fields: [],
      async run({ env, store, mode }) {
        const p = await sp(env, store, mode, 'GET', `/orders/v0/orders?${new URLSearchParams({ MarketplaceIds: mkt(env), CreatedAfter: new Date(Date.now() - 7 * 86400000).toISOString(), MaxResultsPerPage: '1' })}`);
        return { type: 'message', title: 'Amazon Seller is connected', text: `Marketplace ${mkt(env)}${mode === 'test' ? ' (sandbox)' : ''}: ${(p.Orders || []).length ? 'orders found this week' : 'no orders this week'}.` };
      },
    },
    {
      id: 'sync_listings', label: 'Sync stock to Amazon', placement: ['settings'], context: ['menu'], fields: [],
      async run({ env, store, mode, context }) {
        const seller = String(env.AMAZON_SELLER_ID || '').trim();
        if (!seller) throw new Error('Set the Seller ID (merchant token) in Set up first.');
        const qty = Math.max(0, Math.round(Number(env.AMAZON_SELLER_QUANTITY || 10)));
        const f = Number(env.AMAZON_SELLER_PRICE_FACTOR); const withPrice = Number.isFinite(f) && f > 0;
        const cur = String(env.AMAZON_SELLER_CURRENCY || '').trim().toUpperCase();
        if (withPrice && !/^[A-Z]{3}$/.test(cur)) throw new Error('Set the marketplace currency (e.g. USD) to change prices, or clear the price factor.');
        const r = await syncItems(store, menuItems(context), async (i) => {
          const sku = skuOf(i);
          const patches = [{ op: 'replace', path: '/attributes/fulfillment_availability', value: [{ fulfillment_channel_code: 'DEFAULT', quantity: i.available ? qty : 0 }] }];
          if (withPrice) patches.push({ op: 'replace', path: '/attributes/purchasable_offer', value: [{ marketplace_id: mkt(env), currency: cur, our_price: [{ schedule: [{ value_with_tax: Math.round(Number(i.price) * f * 100) / 100 }] }] }] });
          const out = await sp(env, store, mode, 'PATCH', `/listings/2021-08-01/items/${encodeURIComponent(seller)}/${encodeURIComponent(sku)}?marketplaceIds=${encodeURIComponent(mkt(env))}`, { productType: 'PRODUCT', patches });
          if (out?.status && out.status !== 'ACCEPTED') throw new Error(`${sku}: ${(out.issues || []).map((x) => x.message).join('; ') || out.status}`);
          return sku;
        });
        return { type: 'message', title: 'Amazon sync', text: `${syncSummary('Amazon', r)}${withPrice ? '' : ' Prices unchanged (no price factor set).'}` };
      },
    },
    {
      id: 'orders', label: 'Latest Amazon orders', placement: ['settings'], fields: [],
      async run({ env, store, mode }) {
        const p = await sp(env, store, mode, 'GET', `/orders/v0/orders?${new URLSearchParams({ MarketplaceIds: mkt(env), CreatedAfter: new Date(Date.now() - 14 * 86400000).toISOString(), MaxResultsPerPage: '5' })}`);
        const lines = (p.Orders || []).map((o) => `${o.AmazonOrderId} ${o.OrderStatus} ${o.OrderTotal?.CurrencyCode || ''} ${o.OrderTotal?.Amount || ''}`);
        return { type: 'message', title: 'Latest Amazon orders', text: lines.length ? lines.join(' · ') : 'No orders in the last 14 days.' };
      },
    },
  ],
};
