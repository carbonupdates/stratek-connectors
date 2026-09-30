// printful -- print-on-demand: Printful prints and ships a sale's custom products
// (T-shirts, mugs, posters...) straight to the customer.
// Printful -> Settings -> API -> create a private token (scopes: orders, stores_list,
// sync_products). Set up your products in a Printful "Manual order / API" store; each
// product variant gets an External ID -- use your Stratek item SKUs there (or type the
// Printful variant IDs / external IDs on the button).
//   API: https://api.printful.com (Bearer token, X-PF-Store-Id)
//        GET /stores, POST /orders/estimate-costs, POST /orders?confirm=true,
//        GET /orders/@{external_id}
// Buttons: Test Printful (Integrations tab); Price Printful order, Confirm Printful order
// (needs a person -- Printful charges your card / wallet), Track Printful order (sale details).

import { sale } from './_util.js';
import { recipientFields, recipient, skuLines, skuField, shipmentFor, rememberShipment, noShipment, readJson } from './_ship.js';

const BASE = 'https://api.printful.com';

async function pf(env, method, path, body) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { Authorization: `Bearer ${String(env.PRINTFUL_TOKEN).trim()}`, Accept: 'application/json', ...(env.PRINTFUL_STORE_ID ? { 'X-PF-Store-Id': String(env.PRINTFUL_STORE_ID).trim() } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 401) throw new Error('Printful did not accept the token.');
  if (!res.ok) throw new Error(`Printful: ${j?.error?.message || j?.result || `error ${res.status}`}`.slice(0, 300));
  return j?.result ?? j;
}

const pfRecipient = (to) => ({ name: to.name, address1: to.address, city: to.city, ...(to.state ? { state_code: to.state } : {}), country_code: to.country, ...(to.postalCode ? { zip: to.postalCode } : {}), ...(to.phone ? { phone: to.phone } : {}), ...(to.email ? { email: to.email } : {}) });
const pfItems = (list) => list.map((l) => (/^\d+$/.test(l.sku) ? { sync_variant_id: Number(l.sku), quantity: l.qty } : { external_variant_id: l.sku, quantity: l.qty }));
const orderFields = [...recipientFields({ state: true, weight: false }), skuField];

export default {
  id: 'printful',
  name: 'Printful',
  category: 'fulfilment',
  status: 'available',
  color: '#EE4B2B',
  description: 'Print-on-demand: Printful prints and ships custom products for a sale.',
  docsUrl: 'https://developers.printful.com/docs/',
  test: { support: 'none', note: 'Printful has no test mode: "Price Printful order" is free; only "Confirm" creates a paid order.' },
  secrets: [
    { name: 'PRINTFUL_TOKEN', label: 'Printful private token', hint: 'Printful -> Settings -> API -> Create token (orders, stores list, sync products).' },
    { name: 'PRINTFUL_STORE_ID', label: 'Store ID', hint: 'Optional if the token is for one store ("Test Printful" lists them).', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test Printful', placement: ['settings'], fields: [],
      async run({ env }) {
        const stores = [].concat(await pf(env, 'GET', '/stores'));
        return { type: 'message', title: 'Printful is connected', text: stores.length ? `Stores: ${stores.slice(0, 5).map((s) => `${s.name} (ID ${s.id})`).join(', ')}.` : 'Connected.' };
      },
    },
    {
      id: 'quote', label: 'Price Printful order', placement: ['transaction'], fields: orderFields,
      async run({ env, fields, context }) {
        const tx = sale(context);
        const r = await pf(env, 'POST', '/orders/estimate-costs', { recipient: pfRecipient(recipient(fields, context)), items: pfItems(skuLines(fields.skus, tx)) });
        const c = r.costs || {};
        return { type: 'message', title: 'Printful price', text: `${c.currency || ''} ${c.total ?? '?'} (products ${c.subtotal ?? '?'}, shipping ${c.shipping ?? '?'}${Number(c.tax) ? `, tax ${c.tax}` : ''}${Number(c.vat) ? `, VAT ${c.vat}` : ''}).` };
      },
    },
    {
      id: 'confirm_order', outbound: true, label: 'Confirm Printful order', placement: ['transaction'], fields: orderFields,
      async run({ env, fields, context, store }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (had?.orderId) return { type: 'status', title: 'Printful', status: 'Already ordered', text: `Order ${had.orderId} for sale #${tx.id}.` };
        const o = await pf(env, 'POST', '/orders?confirm=true', { external_id: `stratek-${tx.id}`, recipient: pfRecipient(recipient(fields, context)), items: pfItems(skuLines(fields.skus, tx)) });
        await rememberShipment(store, tx, { orderId: o.id });
        return { type: 'status', title: 'Printful', status: o.status || 'pending', text: `Order ${o.id} confirmed -- ${o.costs?.currency || ''} ${o.costs?.total ?? ''}. Printful prints and ships it.` };
      },
    },
    {
      id: 'track', label: 'Track Printful order', placement: ['transaction'], fields: [],
      async run({ env, context, store }) {
        const tx = sale(context);
        if (!(await shipmentFor(store, tx))?.orderId) return noShipment('Printful');
        const o = await pf(env, 'GET', `/orders/@stratek-${encodeURIComponent(tx.id)}`);
        const s = (o.shipments || [])[0];
        return { type: 'status', title: `Printful order ${o.id}`, status: o.status || 'pending', text: s ? [s.carrier, s.tracking_number, s.tracking_url].filter(Boolean).join(' · ') : 'Not shipped yet.' };
      },
    },
  ],
};
