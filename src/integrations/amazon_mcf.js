// amazon_mcf -- Amazon Multi-Channel Fulfillment: Amazon ships your Stratek sales from your
// FBA inventory. Needs an Amazon seller account with FBA stock and a private SP-API app
// (Seller Central -> Apps and services -> Develop apps; role: Amazon Fulfillment). Authorise
// the app for your own account to get its refresh token. SKUs are your Amazon seller SKUs.
//   Token: POST https://api.amazon.com/auth/o2/token (refresh_token grant)
//   API:   https://sellingpartnerapi-{na|eu|fe}.amazon.com (test: sandbox.sellingpartnerapi-...)
//          /fba/outbound/2020-07-01/fulfillmentOrders/preview, /fulfillmentOrders,
//          /fulfillmentOrders/{id}, /tracking?packageNumber=
// Buttons (sale details): Preview Amazon fulfillment, Fulfil with Amazon (MCF) (needs a person --
// Amazon charges fulfilment fees), Track Amazon fulfillment.

import { sale } from './_util.js';
import { recipientFields, recipient, skuLines, skuField, shipmentFor, rememberShipment, noShipment, readJson, cachedToken } from './_ship.js';

const HOSTS = { na: 'sellingpartnerapi-na.amazon.com', eu: 'sellingpartnerapi-eu.amazon.com', fe: 'sellingpartnerapi-fe.amazon.com' };
const region = (env) => { const r = String(env.AMAZON_REGION || 'na').trim().toLowerCase(); if (!HOSTS[r]) throw new Error('Amazon region must be na, eu or fe.'); return r; };
const base = (env, mode) => `https://${mode === 'test' ? 'sandbox.' : ''}${HOSTS[region(env)]}/fba/outbound/2020-07-01`;
const SPEEDS = ['Standard', 'Expedited', 'Priority'];

async function lwa(env, store, mode) {
  return cachedToken(store, `token:${mode}`, async () => {
    const res = await fetch('https://api.amazon.com/auth/o2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: String(env.AMAZON_REFRESH_TOKEN).trim(), client_id: String(env.AMAZON_LWA_CLIENT_ID).trim(), client_secret: String(env.AMAZON_LWA_CLIENT_SECRET).trim() }) });
    const j = await readJson(res);
    if (!res.ok || !j?.access_token) throw new Error(`Amazon (Login with Amazon): ${j?.error_description || 'the client ID / secret / refresh token were refused'}.`);
    return { token: j.access_token, expiresIn: j.expires_in };
  });
}

async function sp(env, store, mode, method, path, body) {
  const res = await fetch(`${base(env, mode)}${path}`, { method, headers: { 'x-amz-access-token': await lwa(env, store, mode), Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 403) throw new Error('Amazon: access denied -- the app needs the Amazon Fulfillment role, and the refresh token must be for this seller account.');
  if (!res.ok) throw new Error(`Amazon: ${(j?.errors || []).map((e) => e.message).join('; ') || `error ${res.status}`}`);
  return j?.payload ?? j;
}

const address = (to) => ({ name: to.name, addressLine1: to.address.slice(0, 60), city: to.city, ...(to.state ? { stateOrRegion: to.state } : { stateOrRegion: to.city }), postalCode: to.postalCode, countryCode: to.country, phone: to.phone });
const itemsFor = (list, withPrice, currency) => list.map((i, n) => ({ sellerSku: i.sku, sellerFulfillmentOrderItemId: `${n + 1}`, quantity: i.qty, ...(withPrice && i.price ? { perUnitDeclaredValue: { currencyCode: currency, value: String(i.price) } } : {}) }));
const speed = (v) => { const s = SPEEDS.find((x) => x.toLowerCase() === String(v || 'Standard').trim().toLowerCase()); if (!s) throw new Error('Speed must be Standard, Expedited or Priority.'); return s; };

export default {
  id: 'amazon_mcf',
  name: 'Amazon Multi-Channel Fulfillment',
  category: 'fulfilment',
  status: 'available',
  color: '#FF9900',
  description: 'Amazon ships your Stratek sales from your FBA inventory (Multi-Channel Fulfillment).',
  docsUrl: 'https://developer-docs.amazon.com/sp-api/docs/fulfillment-outbound-api',
  test: { support: 'sandbox', note: 'Test mode calls the SP-API sandbox, which returns sample answers; nothing is shipped.' },
  secrets: [
    { name: 'AMAZON_LWA_CLIENT_ID', label: 'Login with Amazon client ID', hint: 'Seller Central -> Apps and services -> Develop apps -> your app (role: Amazon Fulfillment).' },
    { name: 'AMAZON_LWA_CLIENT_SECRET', label: 'Login with Amazon client secret' },
    { name: 'AMAZON_REFRESH_TOKEN', label: 'Selling Partner refresh token', hint: 'Develop apps -> your app -> Authorise -> copy the refresh token (Atzr|...).' },
    { name: 'AMAZON_MARKETPLACE_ID', label: 'Marketplace ID', hint: 'e.g. ATVPDKIKX0DER (US), A21TJRUUN4KGV (India), A1F83G8C2ARO7P (UK).' },
    { name: 'AMAZON_REGION', label: 'SP-API region (na, eu, fe)', hint: 'Optional, default na. India and UK are eu; Japan, Singapore, Australia are fe.', optional: true },
  ],
  actions: [
    {
      id: 'preview', label: 'Preview Amazon fulfillment', placement: ['transaction'], fields: [...recipientFields({ state: true, weight: false }), skuField],
      async run({ env, fields, context, store, mode }) {
        const tx = sale(context);
        const to = recipient(fields, context);
        const p = await sp(env, store, mode, 'POST', '/fulfillmentOrders/preview', { marketplaceId: String(env.AMAZON_MARKETPLACE_ID).trim(), address: address(to), items: itemsFor(skuLines(fields.skus, tx), false) });
        const rows = (p.fulfillmentPreviews || []).map((x) => {
          const fee = (x.estimatedFees || []).reduce((s, f) => s + Number(f.amount?.value || 0), 0);
          const cur = x.estimatedFees?.[0]?.amount?.currencyCode || '';
          const eta = x.fulfillmentPreviewShipments?.[0]?.latestArrivalDate;
          return `${x.shippingSpeedCategory}: ${x.isFulfillable ? `${cur} ${fee.toFixed(2)}${eta ? `, arrives by ${String(eta).slice(0, 10)}` : ''}` : `not possible (${(x.unfulfillablePreviewItems || []).map((u) => u.sellerSku).join(', ') || 'no stock'})`}`;
        });
        return { type: 'message', title: 'Amazon fulfillment preview', text: rows.length ? rows.join(' · ') : 'Amazon returned no options.' };
      },
    },
    {
      id: 'create_fulfillment', outbound: true, label: 'Fulfil with Amazon (MCF)', placement: ['transaction'],
      fields: [...recipientFields({ state: true, weight: false }), skuField, { name: 'speed', label: 'Speed (Standard, Expedited, Priority)', type: 'text' }],
      async run({ env, fields, context, store, mode }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (had?.orderId) return { type: 'status', title: 'Amazon MCF', status: 'Already sent', text: `Fulfillment order ${had.orderId}.` };
        const to = recipient(fields, context);
        const orderId = `stratek-${tx.id}`;
        await sp(env, store, mode, 'POST', '/fulfillmentOrders', {
          marketplaceId: String(env.AMAZON_MARKETPLACE_ID).trim(), sellerFulfillmentOrderId: orderId, displayableOrderId: `S${tx.id}`,
          displayableOrderDate: new Date().toISOString(), displayableOrderComment: 'Thank you for your order.',
          shippingSpeedCategory: speed(fields.speed), fulfillmentAction: 'Ship', destinationAddress: address(to),
          ...(to.email ? { notificationEmails: [to.email] } : {}),
          items: itemsFor(skuLines(fields.skus, tx), true, tx.currency),
        });
        await rememberShipment(store, tx, { orderId });
        return { type: 'status', title: 'Amazon MCF', status: 'Received', text: `Fulfillment order ${orderId}${mode === 'test' ? ' (sandbox)' : ''}. Amazon ships it from your FBA stock.` };
      },
    },
    {
      id: 'track', label: 'Track Amazon fulfillment', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (!had?.orderId) return noShipment('Amazon MCF');
        const o = await sp(env, store, mode, 'GET', `/fulfillmentOrders/${encodeURIComponent(had.orderId)}`);
        const status = o.fulfillmentOrder?.fulfillmentOrderStatus || 'Received';
        const pkg = (o.fulfillmentShipments || []).flatMap((s) => s.fulfillmentShipmentPackage || [])[0];
        if (!pkg) return { type: 'status', title: `Amazon ${had.orderId}`, status, text: 'Not shipped yet.' };
        const t = await sp(env, store, mode, 'GET', `/tracking?packageNumber=${encodeURIComponent(pkg.packageNumber)}`).catch(() => ({}));
        return { type: 'status', title: `Amazon ${had.orderId}`, status: t.currentStatus || status, text: [pkg.carrierCode, pkg.trackingNumber, t.estimatedArrivalDate && `arrives ${String(t.estimatedArrivalDate).slice(0, 10)}`].filter(Boolean).join(' · ') };
      },
    },
  ],
};
