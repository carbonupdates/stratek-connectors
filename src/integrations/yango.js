// yango -- same-day courier deliveries with Yango Delivery (where Yango Delivery operates).
// Yango Delivery business account -> Integration -> API token. Your pickup point is set once
// below (address + map pin "lat,lon"; a pin makes the courier price exact).
//   API: https://b2b.taxi.yandex.net/b2b/cargo/integration/v2 (Bearer token)
//        POST /check-price, POST /claims/create?request_id=, POST /claims/info?claim_id=,
//        POST /claims/accept?claim_id= (confirming is what orders -- and pays for -- the courier)
// Buttons (sale details): Yango price, Send with Yango (needs a person; press again if Yango
// is still pricing it), Track Yango delivery.

import { sale } from './_util.js';
import { readJson, recipient, lines, shipmentFor, rememberShipment, noShipment } from './_ship.js';
import { randomToken } from './_nepal.js';

const BASE = 'https://b2b.taxi.yandex.net/b2b/cargo/integration/v2';

async function yg(env, path, body) {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${String(env.YANGO_API_TOKEN).trim()}`, 'Accept-Language': 'en', 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const j = await readJson(res);
  if (res.status === 401 || res.status === 403) throw new Error('Yango did not accept the API token.');
  if (res.status === 409) throw new Error(`Yango: no courier can take this route right now${j?.message ? ` (${j.message})` : ''}.`);
  if (!res.ok) throw new Error(`Yango: ${j?.message || j?.code || `error ${res.status}`}`);
  return j || {};
}

/** "27.7172, 85.3240" -> [lon, lat] (Yango wants longitude first). */
export function lonLat(v, what) {
  const s = String(v || '').trim();
  if (!s) return null;
  const m = s.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (!m || Math.abs(+m[1]) > 90 || Math.abs(+m[2]) > 180) throw new Error(`${what}: use the map pin as "latitude, longitude", e.g. 27.7172, 85.3240.`);
  return [Number(m[2]), Number(m[1])];
}

const pickup = (env) => ({ fullname: String(env.YANGO_PICKUP_ADDRESS || '').trim(), coordinates: lonLat(env.YANGO_PICKUP_COORDS, 'Pickup pin') });
const taxiClass = (env) => String(env.YANGO_TAXI_CLASS || 'express').trim();
const kgOf = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 && n <= 300 ? n : 1; };
const pointAddr = (a) => ({ fullname: a.fullname, ...(a.coordinates ? { coordinates: a.coordinates } : {}) });

const dropFields = [
  { name: 'recipientName', label: 'Recipient name', type: 'text' },
  { name: 'recipientPhone', label: 'Recipient phone (with country code)', type: 'tel' },
  { name: 'recipientAddress', label: 'Delivery address (street, area)', type: 'text', required: true },
  { name: 'recipientCity', label: 'City', type: 'text', required: true },
  { name: 'recipientPin', label: 'Map pin "latitude, longitude" (optional, more exact)', type: 'text' },
  { name: 'weight', label: 'Weight (kg, optional)', type: 'number' },
];

export default {
  id: 'yango',
  name: 'Yango Delivery',
  category: 'delivery',
  status: 'available',
  color: '#FF3D00',
  description: 'Same-day courier deliveries with Yango Delivery (where it operates).',
  docsUrl: 'https://yango.delivery/',
  test: { support: 'none', note: 'Yango has no test mode: "Yango price" is free; only "Send with Yango" orders a courier.' },
  secrets: [
    { name: 'YANGO_API_TOKEN', label: 'Yango Delivery API token', hint: 'Yango Delivery business account -> Integration -> API token.' },
    { name: 'YANGO_PICKUP_ADDRESS', label: 'Pickup address', hint: 'Your shop address, used for every delivery.' },
    { name: 'YANGO_PICKUP_COORDS', label: 'Pickup map pin (latitude, longitude)', hint: 'Optional but recommended, e.g. 27.6710, 85.3140 (right-click the place in Google Maps).', optional: true },
    { name: 'YANGO_CONTACT_NAME', label: 'Pickup contact name' },
    { name: 'YANGO_CONTACT_PHONE', label: 'Pickup contact phone (with country code)' },
    { name: 'YANGO_TAXI_CLASS', label: 'Courier type', hint: 'Optional: courier, express (default) or cargo.', optional: true },
  ],
  actions: [
    {
      id: 'quote', label: 'Yango price', placement: ['transaction'], fields: dropFields,
      async run({ env, fields }) {
        const drop = { fullname: `${String(fields.recipientAddress || '').trim()}, ${String(fields.recipientCity || '').trim()}`, coordinates: lonLat(fields.recipientPin, 'Delivery pin') };
        const r = await yg(env, '/check-price', {
          items: [{ quantity: 1, weight: kgOf(fields.weight), size: { length: 0.3, width: 0.2, height: 0.2 }, pickup_point: 1, dropoff_point: 2 }],
          route_points: [{ id: 1, ...pointAddr(pickup(env)) }, { id: 2, ...pointAddr(drop) }],
          requirements: { taxi_class: taxiClass(env) },
        });
        return { type: 'message', title: 'Yango price', text: `${r.currency_rules?.code || ''} ${r.price ?? '?'}${r.eta ? `, courier in ~${r.eta} min` : ''}${r.distance_meters ? ` (${(r.distance_meters / 1000).toFixed(1)} km)` : ''}.` };
      },
    },
    {
      id: 'create_delivery', label: 'Send with Yango', placement: ['transaction'], fields: dropFields,
      async run({ env, fields, context, store }) {
        const tx = sale(context);
        let s = await shipmentFor(store, tx);
        if (s?.accepted) return { type: 'status', title: 'Yango', status: 'Courier ordered', text: `Delivery ${s.claimId} is already ordered for this sale.` };
        if (!s?.claimId) {
          const to = recipient({ ...fields, country: 'XX' }, context);
          const drop = { fullname: `${to.address}, ${to.city}`, coordinates: lonLat(fields.recipientPin, 'Delivery pin') };
          const contact = { name: String(env.YANGO_CONTACT_NAME || 'Shop').trim(), phone: String(env.YANGO_CONTACT_PHONE || '').trim() };
          const c = await yg(env, `/claims/create?request_id=${encodeURIComponent(`stratek-${tx.id}-${randomToken(4)}`)}`, {
            items: lines(tx).slice(0, 30).map((i, n) => ({ extra_id: `${n + 1}`, pickup_point: 1, dropoff_point: 2, title: String(i.name).slice(0, 100), cost_value: Number(i.price).toFixed(2), cost_currency: tx.currency, quantity: Number(i.qty || 1), weight: n === 0 ? kgOf(fields.weight) : 0.1 })),
            route_points: [
              { point_id: 1, visit_order: 1, type: 'source', contact, address: pointAddr(pickup(env)) },
              { point_id: 2, visit_order: 2, type: 'destination', contact: { name: to.name, phone: to.phone }, address: pointAddr(drop), external_order_id: `S${tx.id}` },
            ],
            client_requirements: { taxi_class: taxiClass(env) }, emergency_contact: contact, comment: `Stratek sale #${tx.id}`,
          });
          s = { claimId: c.id, version: c.version || 1 };
          await rememberShipment(store, tx, s);
        }
        const info = await yg(env, `/claims/info?claim_id=${encodeURIComponent(s.claimId)}`);
        if (info.status !== 'ready_for_approval') {
          if (['failed', 'estimating_failed', 'cancelled'].includes(info.status)) { await store.delete(`tx:${tx.id}`); throw new Error(`Yango could not price this delivery (${info.status}). Check the address or pin and try again.`); }
          return { type: 'status', title: 'Yango', status: 'Pricing', text: `Yango is pricing delivery ${s.claimId}. Press "Send with Yango" again in a few seconds to order the courier.` };
        }
        await yg(env, `/claims/accept?claim_id=${encodeURIComponent(s.claimId)}`, { version: info.version || s.version || 1 });
        await rememberShipment(store, tx, { ...s, accepted: true });
        const price = info.pricing?.offer?.price || info.pricing?.final_price;
        return { type: 'status', title: 'Yango', status: 'Courier ordered', text: `Delivery ${s.claimId}${price ? ` -- ${info.pricing?.currency || ''} ${price}` : ''}. Yango is finding a courier.` };
      },
    },
    {
      id: 'track', label: 'Track Yango delivery', placement: ['transaction'], fields: [],
      async run({ env, context, store }) {
        const tx = sale(context);
        const s = await shipmentFor(store, tx);
        if (!s?.claimId) return noShipment('Yango');
        const info = await yg(env, `/claims/info?claim_id=${encodeURIComponent(s.claimId)}`);
        const p = info.performer_info || {};
        return { type: 'status', title: `Yango ${s.claimId}`, status: info.status || 'new', text: [p.courier_name, p.car_model, p.car_number].filter(Boolean).join(' · ') || (s.accepted ? 'Looking for a courier.' : 'Not ordered yet.') };
      },
    },
  ],
};
