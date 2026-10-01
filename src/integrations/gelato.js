// gelato -- print-on-demand printed close to the customer (Gelato prints in 30+ countries,
// including India and much of Asia): posters, cards, mugs, T-shirts, photo books...
// dashboard.gelato.com -> Developer -> API keys -> create a key.
// Each product is a Gelato product UID (from Gelato's product catalogue / Product UID tool)
// plus your print file (a public https PDF / PNG). Type them on the button, or use Gelato
// product UIDs as your Stratek item SKUs.
//   API: https://order.gelatoapis.com/v4 (header X-API-KEY)
//        POST /orders:quote, POST /orders, GET /orders/{id}
// Buttons (sale details): Price Gelato order, Confirm Gelato order (needs a person -- Gelato
// charges you), Track Gelato order.

import { sale } from './_util.js';
import { recipientFields, recipient, skuLines, shipmentFor, rememberShipment, noShipment, readJson } from './_ship.js';

const BASE = 'https://order.gelatoapis.com/v4';

async function gl(env, method, path, body) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { 'X-API-KEY': String(env.GELATO_API_KEY).trim(), Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 401 || res.status === 403) throw new Error('Gelato did not accept the API key.');
  if (!res.ok) throw new Error(`Gelato: ${j?.message || j?.code || `error ${res.status}`}${j?.details?.length ? ` (${j.details.map((d) => d.message || d).join('; ').slice(0, 150)})` : ''}`);
  return j || {};
}

function fileUrl(v) {
  const s = String(v || '').trim();
  let u; try { u = new URL(s); } catch { throw new Error('Paste the print file address (https://...pdf or .png).'); }
  if (u.protocol !== 'https:') throw new Error('The print file address must start with https://');
  return u.toString();
}
const address = (to) => { const [first, ...rest] = to.name.split(/\s+/); return { firstName: first, lastName: rest.join(' ') || first, addressLine1: to.address, city: to.city, postCode: to.postalCode || '', ...(to.state ? { state: to.state } : {}), country: to.country, ...(to.email ? { email: to.email } : {}), phone: to.phone }; };
const fields = [...recipientFields({ state: true, weight: false }), { name: 'skus', label: 'Gelato product UIDs and quantities (e.g. flat_130x180-mm_... x2)', type: 'text' }, { name: 'fileUrl', label: 'Print file address (https, PDF or PNG)', type: 'text', required: true }];
const lineItems = (f, tx) => { const url = fileUrl(f.fileUrl); return skuLines(f.skus, tx).map((l, n) => ({ itemReferenceId: `stratek-${tx.id}-${n + 1}`, productUid: l.sku, quantity: l.qty, files: [{ type: 'default', url }] })); };

export default {
  id: 'gelato',
  name: 'Gelato',
  category: 'fulfilment',
  status: 'available',
  color: '#1D6E5F',
  description: 'Print-on-demand printed close to the customer in 30+ countries (Gelato).',
  docsUrl: 'https://dashboard.gelato.com/docs/',
  test: { support: 'none', note: 'Gelato has no test mode: "Price" is free; only "Confirm" places a paid order (Gelato lets you cancel before production).' },
  secrets: [
    { name: 'GELATO_API_KEY', label: 'Gelato API key', hint: 'dashboard.gelato.com -> Developer -> API keys.' },
    { name: 'GELATO_CURRENCY', label: 'Currency Gelato bills you in', hint: 'Optional, default USD (e.g. EUR, GBP, INR).', optional: true },
  ],
  actions: [
    {
      id: 'quote', label: 'Price Gelato order', placement: ['transaction'], fields,
      async run({ env, fields: f, context }) {
        const tx = sale(context);
        const to = recipient(f, context);
        const q = await gl(env, 'POST', '/orders:quote', { orderReferenceId: `stratek-${tx.id}-quote`, customerReferenceId: 'stratek', currency: String(env.GELATO_CURRENCY || 'USD').toUpperCase(), allowMultipleQuotes: false, recipient: address(to), products: lineItems(f, tx) });
        const quote = (q.quotes || [])[0] || {};
        const prod = (quote.products || []).reduce((s, p) => s + Number(p.price || 0), 0);
        const ship = (quote.shipmentMethods || []).sort((a, b) => Number(a.price) - Number(b.price))[0];
        return { type: 'message', title: 'Gelato price', text: `Products ${quote.products?.[0]?.currency || ''} ${prod.toFixed(2)}${ship ? ` + ${ship.name} ${ship.price}${ship.maxDeliveryDays ? ` (${ship.minDeliveryDays}-${ship.maxDeliveryDays} days)` : ''}` : ''}${quote.fulfillmentCountry ? `, printed in ${quote.fulfillmentCountry}` : ''}.` };
      },
    },
    {
      id: 'confirm_order', outbound: true, label: 'Confirm Gelato order', placement: ['transaction'], fields,
      async run({ env, fields: f, context, store }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (had?.orderId) return { type: 'status', title: 'Gelato', status: 'Already ordered', text: `Order ${had.orderId} for sale #${tx.id}.` };
        const o = await gl(env, 'POST', '/orders', { orderType: 'order', orderReferenceId: `stratek-${tx.id}`, customerReferenceId: 'stratek', currency: String(env.GELATO_CURRENCY || 'USD').toUpperCase(), items: lineItems(f, tx), shippingAddress: address(recipient(f, context)) });
        await rememberShipment(store, tx, { orderId: o.id });
        return { type: 'status', title: 'Gelato', status: o.fulfillmentStatus || 'created', text: `Order ${o.id} placed. Gelato prints and ships it.` };
      },
    },
    {
      id: 'track', label: 'Track Gelato order', placement: ['transaction'], fields: [],
      async run({ env, context, store }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (!had?.orderId) return noShipment('Gelato');
        const o = await gl(env, 'GET', `/orders/${encodeURIComponent(had.orderId)}`);
        const s = (o.shipment?.packages || [])[0] || {};
        return { type: 'status', title: `Gelato order ${had.orderId}`, status: o.fulfillmentStatus || 'created', text: [o.shipment?.shipmentMethodName, s.trackingCode, s.trackingUrl].filter(Boolean).join(' · ') || 'Not shipped yet.' };
      },
    },
  ],
};
