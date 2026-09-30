// shipbob -- have ShipBob's warehouses pick, pack and ship a sale from your stock there.
// ShipBob dashboard -> Integrations -> API tokens -> generate a Personal Access Token.
// A sandbox account (developer.shipbob.com/sandbox) gives a separate token for Test keys.
// Products are matched by SKU: the sale items' SKUs, or type them on the button.
//   API: https://api.shipbob.com (test: https://sandbox-api.shipbob.com), version 2025-07
//        GET /channel, POST /order (header shipbob_channel_id), GET /order/{id}/shipment
// Buttons: Test ShipBob (Integrations tab); Fulfil with ShipBob (needs a person -- ShipBob
// charges for fulfilment), ShipBob tracking (sale details).

import { sale } from './_util.js';
import { recipientFields, recipient, skuLines, skuField, shipmentFor, rememberShipment, noShipment, readJson } from './_ship.js';

const VERSION = '2025-07';
const base = (mode) => (mode === 'test' ? 'https://sandbox-api.shipbob.com' : 'https://api.shipbob.com');

async function sb(env, mode, method, path, body, channel) {
  const res = await fetch(`${base(mode)}/${VERSION}${path}`, { method, headers: { Authorization: `Bearer ${String(env.SHIPBOB_TOKEN).trim()}`, Accept: 'application/json', ...(channel ? { shipbob_channel_id: String(channel) } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 401) throw new Error('ShipBob did not accept the token (sandbox and live tokens are different).');
  if (!res.ok) {
    const errs = j?.errors ? Object.entries(j.errors).map(([k, v]) => `${k}: ${[].concat(v).join(', ')}`).join('; ') : '';
    throw new Error(`ShipBob: ${errs || j?.title || j?.message || j?._text || `error ${res.status}`}`.slice(0, 300));
  }
  return j;
}

async function channelId(env, store, mode) {
  if (env.SHIPBOB_CHANNEL_ID) return String(env.SHIPBOB_CHANNEL_ID).trim();
  const key = `channel:${mode}`;
  const have = await store.get(key);
  if (have) return have;
  const list = [].concat(await sb(env, mode, 'GET', '/channel'));
  const c = list.find((x) => (x.scopes || []).some((s) => /orders_write/.test(s))) || list[0];
  if (!c?.id) throw new Error('ShipBob: this token has no channel. Generate the token with order access.');
  await store.put(key, String(c.id));
  return String(c.id);
}

export default {
  id: 'shipbob',
  name: 'ShipBob',
  category: 'fulfilment',
  status: 'available',
  color: '#1E62EC',
  description: 'ShipBob warehouses pick, pack and ship your sales from your stock there.',
  docsUrl: 'https://developer.shipbob.com/',
  test: { support: 'sandbox', note: 'A ShipBob sandbox account has its own token; sandbox orders are not shipped.' },
  secrets: [
    { name: 'SHIPBOB_TOKEN', label: 'ShipBob Personal Access Token', hint: 'ShipBob -> Integrations -> API tokens -> Generate.' },
    { name: 'SHIPBOB_SHIPPING_METHOD', label: 'Ship option', hint: 'Optional, default Standard (must match a Ship Option in ShipBob).', optional: true },
    { name: 'SHIPBOB_CHANNEL_ID', label: 'Channel ID', hint: 'Optional; found automatically.', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test ShipBob', placement: ['settings'], fields: [],
      async run({ env, store, mode }) {
        const id = await channelId(env, store, mode);
        return { type: 'message', title: 'ShipBob is connected', text: `Orders will go to channel ${id}${mode === 'test' ? ' (sandbox)' : ''}.` };
      },
    },
    {
      id: 'create_order', outbound: true, label: 'Fulfil with ShipBob', placement: ['transaction'], fields: [...recipientFields({ state: true, weight: false }), skuField],
      async run({ env, fields, context, store, mode }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (had?.orderId) return { type: 'status', title: 'ShipBob', status: 'Already sent', text: `Order ${had.orderId} for sale #${tx.id}.` };
        const to = recipient(fields, context);
        const items = skuLines(fields.skus, tx);
        const o = await sb(env, mode, 'POST', '/order', {
          reference_id: `stratek-${tx.id}`, order_number: `S${tx.id}`, type: 'DTC',
          shipping_method: String(env.SHIPBOB_SHIPPING_METHOD || 'Standard').trim(), purchase_date: new Date().toISOString(),
          recipient: { name: to.name, phone_number: to.phone, ...(to.email ? { email: to.email } : {}), address: { address1: to.address, city: to.city, ...(to.state ? { state: to.state } : {}), zip_code: to.postalCode, country: to.country } },
          products: items.map((i) => ({ reference_id: i.sku, quantity: i.qty, ...(i.name ? { name: i.name } : {}), ...(i.price ? { unit_price: i.price } : {}) })),
          tags: [{ name: 'source', value: 'stratek' }],
        }, await channelId(env, store, mode));
        await rememberShipment(store, tx, { orderId: o.id });
        return { type: 'status', title: 'ShipBob', status: o.status || 'Processing', text: `Order ${o.id}${mode === 'test' ? ' (sandbox)' : ''} -- ${items.map((i) => `${i.sku} x${i.qty}`).join(', ')}.` };
      },
    },
    {
      id: 'track', label: 'ShipBob tracking', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (!had?.orderId) return noShipment('ShipBob');
        const list = [].concat(await sb(env, mode, 'GET', `/order/${encodeURIComponent(had.orderId)}/shipment`));
        const s = list[0] || {};
        const t = s.tracking || {};
        return { type: 'status', title: `ShipBob order ${had.orderId}`, status: s.status || 'Processing', text: [t.carrier, t.tracking_number, t.tracking_url].filter(Boolean).join(' · ') || 'Not shipped yet.' };
      },
    },
  ],
};
