// printify -- print-on-demand: a Printify print provider prints and ships a sale's custom
// products to the customer. Printify -> My profile -> Connections -> generate a personal
// access token (scopes shops.read, orders.read, orders.write). Products are matched by the
// variant SKU you set in Printify -- use your Stratek item SKUs, or type them on the button.
//   API: https://api.printify.com/v1 (Bearer token)
//        GET /shops.json, POST /shops/{id}/orders/shipping.json, POST /shops/{id}/orders.json,
//        POST /shops/{id}/orders/{order}/send_to_production.json, GET /shops/{id}/orders/{order}.json
// Buttons: Test Printify (Integrations tab); Printify shipping price, Confirm Printify order
// (needs a person -- Printify charges you when it goes to production), Track Printify order.

import { sale } from './_util.js';
import { recipientFields, recipient, skuLines, skuField, shipmentFor, rememberShipment, noShipment, readJson } from './_ship.js';

const BASE = 'https://api.printify.com/v1';
const shopId = (env) => { const s = String(env.PRINTIFY_SHOP_ID || '').trim(); if (!/^\d+$/.test(s)) throw new Error('Set the Printify shop ID in Set up ("Test Printify" lists your shops).'); return s; };

async function py(env, method, path, body) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { Authorization: `Bearer ${String(env.PRINTIFY_TOKEN).trim()}`, 'User-Agent': 'Stratek-Connector', Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 401) throw new Error('Printify did not accept the token.');
  if (!res.ok) throw new Error(`Printify: ${j?.message || j?.error || `error ${res.status}`}${j?.errors ? ` (${JSON.stringify(j.errors).slice(0, 200)})` : ''}`);
  return j;
}

const address = (to) => { const [first, ...rest] = to.name.split(/\s+/); return { first_name: first, last_name: rest.join(' ') || first, ...(to.email ? { email: to.email } : {}), phone: to.phone, country: to.country, ...(to.state ? { region: to.state } : {}), address1: to.address, city: to.city, zip: to.postalCode || '' }; };
const items = (list) => list.map((l) => ({ sku: l.sku, quantity: l.qty }));
const cents = (n) => (Number(n || 0) / 100).toFixed(2);
const orderFields = [...recipientFields({ state: true, weight: false }), skuField, { name: 'express', label: 'Express shipping (yes / no)', type: 'text' }];

export default {
  id: 'printify',
  name: 'Printify',
  category: 'fulfilment',
  status: 'available',
  color: '#39B75D',
  description: 'Print-on-demand: a Printify print provider prints and ships custom products for a sale.',
  docsUrl: 'https://developers.printify.com/',
  test: { support: 'none', note: 'Printify has no test mode: the shipping price is free; only "Confirm" sends an order to production.' },
  secrets: [
    { name: 'PRINTIFY_TOKEN', label: 'Printify personal access token', hint: 'Printify -> My profile -> Connections -> Generate (shops.read, orders.read, orders.write).' },
    { name: 'PRINTIFY_SHOP_ID', label: 'Shop ID', hint: '"Test Printify" lists your shops and their IDs.' },
  ],
  actions: [
    {
      id: 'test', label: 'Test Printify', placement: ['settings'], fields: [],
      async run({ env }) {
        const shops = [].concat(await py(env, 'GET', '/shops.json'));
        return { type: 'message', title: 'Printify is connected', text: shops.length ? `Shops: ${shops.slice(0, 6).map((s) => `${s.title} (ID ${s.id})`).join(', ')}.` : 'Connected (no shops yet).' };
      },
    },
    {
      id: 'quote', label: 'Printify shipping price', placement: ['transaction'], fields: orderFields,
      async run({ env, fields, context }) {
        const tx = sale(context);
        const r = await py(env, 'POST', `/shops/${shopId(env)}/orders/shipping.json`, { line_items: items(skuLines(fields.skus, tx)), address_to: address(recipient(fields, context)) });
        const parts = Object.entries(r || {}).filter(([, v]) => Number.isFinite(Number(v))).map(([k, v]) => `${k} USD ${cents(v)}`);
        return { type: 'message', title: 'Printify shipping', text: parts.length ? parts.join(' · ') : 'Printify returned no shipping price.' };
      },
    },
    {
      id: 'confirm_order', outbound: true, label: 'Confirm Printify order', placement: ['transaction'], fields: orderFields,
      async run({ env, fields, context, store }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (had?.sent) return { type: 'status', title: 'Printify', status: 'Already ordered', text: `Order ${had.orderId} for sale #${tx.id}.` };
        const sid = shopId(env);
        let orderId = had?.orderId;
        if (!orderId) {
          const o = await py(env, 'POST', `/shops/${sid}/orders.json`, { external_id: `stratek-${tx.id}`, label: `Stratek ${tx.id}`, line_items: items(skuLines(fields.skus, tx)), shipping_method: /^y/i.test(String(fields.express || '')) ? 2 : 1, send_shipping_notification: false, address_to: address(recipient(fields, context)) });
          orderId = o.id;
          await rememberShipment(store, tx, { orderId });
        }
        await py(env, 'POST', `/shops/${sid}/orders/${encodeURIComponent(orderId)}/send_to_production.json`, {});
        await rememberShipment(store, tx, { orderId, sent: true });
        return { type: 'status', title: 'Printify', status: 'Sent to production', text: `Order ${orderId}. Printify charges your account and ships it.` };
      },
    },
    {
      id: 'track', label: 'Track Printify order', placement: ['transaction'], fields: [],
      async run({ env, context, store }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (!had?.orderId) return noShipment('Printify');
        const o = await py(env, 'GET', `/shops/${shopId(env)}/orders/${encodeURIComponent(had.orderId)}.json`);
        const s = (o.shipments || [])[0];
        return { type: 'status', title: `Printify order ${had.orderId}`, status: o.status || 'on-hold', text: [s && [s.carrier, s.number, s.url].filter(Boolean).join(' · '), o.total_price != null && `total USD ${cents(Number(o.total_price) + Number(o.total_shipping || 0) + Number(o.total_tax || 0))}`].filter(Boolean).join(' -- ') || 'Not shipped yet.' };
      },
    },
  ],
};
