// shipstation -- send sales to ShipStation as orders to pick, pack and label there, and see
// the tracking number once it ships. ShipStation -> Settings -> Account -> API Settings ->
// API key and secret (legacy API, any paid plan).
//   API: https://ssapi.shipstation.com (basic auth key:secret)
//        GET /stores (test), POST /orders/createorder, GET /shipments?orderNumber=
// Buttons: Test ShipStation (Integrations tab); Send order to ShipStation, ShipStation tracking
// (sale details). Sending an order costs nothing -- labels are bought inside ShipStation.

import { sale } from './_util.js';
import { recipientFields, recipient, skuLines, skuField, shipmentFor, rememberShipment, noShipment, readJson } from './_ship.js';

async function ss(env, method, path, body) {
  const res = await fetch(`https://ssapi.shipstation.com${path}`, { method, headers: { Authorization: `Basic ${btoa(`${String(env.SHIPSTATION_API_KEY).trim()}:${String(env.SHIPSTATION_API_SECRET).trim()}`)}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 401) throw new Error('ShipStation did not accept the API key / secret.');
  if (res.status === 429) throw new Error('ShipStation: too many requests this minute -- try again shortly.');
  if (!res.ok) throw new Error(`ShipStation: ${j?.ExceptionMessage || j?.Message || j?._text || `error ${res.status}`}`);
  return j;
}

export default {
  id: 'shipstation',
  name: 'ShipStation',
  category: 'fulfilment',
  status: 'available',
  color: '#84C225',
  description: 'Send sales to ShipStation to pick, pack and label, and see the tracking number.',
  docsUrl: 'https://www.shipstation.com/docs/api/',
  test: { support: 'none', note: 'ShipStation has no test mode; mark test orders cancelled in ShipStation.' },
  secrets: [
    { name: 'SHIPSTATION_API_KEY', label: 'ShipStation API key', hint: 'ShipStation -> Settings -> Account -> API Settings.' },
    { name: 'SHIPSTATION_API_SECRET', label: 'ShipStation API secret' },
    { name: 'SHIPSTATION_STORE_ID', label: 'Store ID', hint: 'Optional: which ShipStation store the orders go to ("Test ShipStation" lists them).', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test ShipStation', placement: ['settings'], fields: [],
      async run({ env }) {
        const stores = await ss(env, 'GET', '/stores?showInactive=false');
        return { type: 'message', title: 'ShipStation is connected', text: stores?.length ? `Stores: ${stores.slice(0, 6).map((s) => `${s.storeName} (ID ${s.storeId})`).join(', ')}.` : 'Connected (no stores yet).' };
      },
    },
    {
      id: 'send_order', label: 'Send order to ShipStation', placement: ['transaction'], fields: [...recipientFields({ state: true, weight: false }), { name: 'weight', label: 'Weight (kg, optional)', type: 'number' }, skuField],
      async run({ env, fields, context, store }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (had?.orderId) return { type: 'message', title: 'Already in ShipStation', text: `Order S${tx.id} (ShipStation ID ${had.orderId}).` };
        const to = recipient(fields, context);
        const items = skuLines(fields.skus, tx);
        const address = { name: to.name, phone: to.phone, street1: to.address, city: to.city, state: to.state || null, postalCode: to.postalCode || null, country: to.country };
        const w = Number(fields.weight);
        const o = await ss(env, 'POST', '/orders/createorder', {
          orderNumber: `S${tx.id}`, orderKey: `stratek-${tx.id}`, orderDate: new Date().toISOString(), orderStatus: 'awaiting_shipment',
          customerEmail: to.email || null, billTo: address, shipTo: address,
          items: items.map((i) => ({ sku: i.sku, name: i.name || i.sku, quantity: i.qty, unitPrice: i.price })),
          amountPaid: Number(tx.amount), internalNotes: `From Stratek sale #${tx.id}`,
          ...(w > 0 ? { weight: { value: Math.round(w * 1000), units: 'grams' } } : {}),
          ...(env.SHIPSTATION_STORE_ID ? { advancedOptions: { storeId: Number(env.SHIPSTATION_STORE_ID) } } : {}),
        });
        await rememberShipment(store, tx, { orderId: o.orderId, orderNumber: o.orderNumber });
        return { type: 'message', title: 'Sent to ShipStation', text: `Order ${o.orderNumber} is waiting to ship (${items.length} line${items.length === 1 ? '' : 's'}).` };
      },
    },
    {
      id: 'track', label: 'ShipStation tracking', placement: ['transaction'], fields: [],
      async run({ env, context, store }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (!had?.orderId) return noShipment('ShipStation');
        const j = await ss(env, 'GET', `/shipments?orderNumber=${encodeURIComponent(had.orderNumber || `S${tx.id}`)}`);
        const s = (j.shipments || []).filter((x) => !x.voided)[0];
        if (!s) return { type: 'status', title: `ShipStation ${had.orderNumber}`, status: 'Awaiting shipment', text: 'No label yet.' };
        return { type: 'status', title: `ShipStation ${had.orderNumber}`, status: 'Shipped', text: [s.carrierCode, s.trackingNumber, s.shipDate].filter(Boolean).join(' · ') };
      },
    },
  ],
};
