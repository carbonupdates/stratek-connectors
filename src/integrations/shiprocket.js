// shiprocket -- ship across India with Shiprocket (for shops selling in INR).
// Shiprocket -> Settings -> API -> Configure -> create an API user (a separate email from
// your login). Add your pickup address in Shiprocket first and put its nickname below.
//   API: https://apiv2.shiprocket.in/v1/external
//        POST /auth/login (token, 10 days), GET /courier/serviceability/, POST /orders/create/adhoc,
//        POST /courier/assign/awb, POST /courier/generate/label, GET /courier/track/awb/{awb}
// Buttons (sale details): Check Shiprocket couriers, Ship with Shiprocket (needs a person --
// it pays for the courier from your Shiprocket wallet), Track Shiprocket shipment.

import { sale } from './_util.js';
import { kg, recipientFields, recipient, lines, shipmentFor, rememberShipment, bookedResult, noShipment, readJson } from './_ship.js';

const BASE = 'https://apiv2.shiprocket.in/v1/external';

async function token(env, store, fresh = false) {
  const have = await store.get('token');
  const who = String(env.SHIPROCKET_EMAIL).trim().toLowerCase();
  if (!fresh && have?.token && have.who === who && have.exp > Date.now()) return have.token;
  const res = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: who, password: String(env.SHIPROCKET_PASSWORD) }) });
  const j = await readJson(res);
  if (!res.ok || !j?.token) throw new Error('Shiprocket did not accept the API user email / password (use the API user, not your login).');
  await store.put('token', { token: j.token, who, exp: Date.now() + 9 * 86400000 });
  return j.token;
}

async function sr(env, store, method, path, body) {
  const call = async (t) => fetch(`${BASE}${path}`, { method, headers: { Authorization: `Bearer ${t}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let res = await call(await token(env, store));
  if (res.status === 401) res = await call(await token(env, store, true));
  const j = await readJson(res);
  if (!res.ok || j?.status_code >= 400) {
    const errs = j?.errors ? Object.values(j.errors).flat().join('; ') : '';
    throw new Error(`Shiprocket: ${errs || j?.message || `error ${res.status}`}`.slice(0, 300));
  }
  return j;
}

const pin = (v, what) => { const p = String(v || '').replace(/\s/g, ''); if (!/^\d{6}$/.test(p)) throw new Error(`${what}: use the 6-digit PIN code.`); return p; };
const inrOnly = (tx) => { if (tx.currency !== 'INR') throw new Error('Shiprocket ships within India -- this sale is not in INR.'); };
const nowIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 16).replace('T', ' ');

export default {
  id: 'shiprocket',
  name: 'Shiprocket',
  category: 'delivery',
  status: 'available',
  color: '#7B3FE4',
  description: 'Ship orders across India with Shiprocket (for INR shops).',
  docsUrl: 'https://apidocs.shiprocket.in/',
  test: { support: 'none', note: 'Shiprocket has no test mode; cancel test orders in Shiprocket before a courier is assigned.' },
  secrets: [
    { name: 'SHIPROCKET_EMAIL', label: 'Shiprocket API user email', hint: 'Shiprocket -> Settings -> API -> Configure -> Create an API user.' },
    { name: 'SHIPROCKET_PASSWORD', label: 'Shiprocket API user password' },
    { name: 'SHIPROCKET_PICKUP_LOCATION', label: 'Pickup location nickname', hint: 'Settings -> Pickup addresses -> the nickname, e.g. Primary.' },
    { name: 'SHIPROCKET_PICKUP_PINCODE', label: 'Pickup PIN code', hint: 'For courier checks, e.g. 110001.' },
  ],
  actions: [
    {
      id: 'quote', label: 'Check Shiprocket couriers', placement: ['transaction'],
      fields: [{ name: 'weight', label: 'Weight (kg)', type: 'number', required: true }, { name: 'recipientPostalCode', label: 'Delivery PIN code', type: 'text', required: true }],
      async run({ env, fields, store }) {
        const q = new URLSearchParams({ pickup_postcode: pin(env.SHIPROCKET_PICKUP_PINCODE, 'Pickup'), delivery_postcode: pin(fields.recipientPostalCode, 'Delivery'), weight: String(kg(fields.weight, 100)), cod: '0' });
        const j = await sr(env, store, 'GET', `/courier/serviceability/?${q}`);
        const list = (j.data?.available_courier_companies || []).sort((a, b) => Number(a.rate) - Number(b.rate)).slice(0, 5);
        return { type: 'message', title: 'Shiprocket couriers', text: list.length ? list.map((c) => `${c.courier_name}: INR ${c.rate}${c.etd ? `, by ${c.etd}` : ''}`).join(' · ') : 'No courier serves this PIN code.' };
      },
    },
    {
      id: 'create_shipment', outbound: true, label: 'Ship with Shiprocket', placement: ['transaction'],
      fields: [...recipientFields({ state: true }).map((f) => (f.name === 'recipientPostalCode' ? { ...f, label: 'PIN code', required: true } : f.name === 'country' ? { ...f, label: 'Country code (default IN)', required: false } : f))],
      async run({ env, fields, context, store }) {
        const tx = sale(context); inrOnly(tx);
        const had = await shipmentFor(store, tx);
        if (had?.awb) return bookedResult({ carrier: 'Shiprocket', number: had.awb, labelUrl: had.labelUrl, mode: 'live', extra: '(already booked for this sale)' });
        const to = recipient({ ...fields, country: fields.country || 'IN' }, context);
        if (to.country !== 'IN') throw new Error('Shiprocket ships within India (country IN).');
        const [first, ...rest] = to.name.split(/\s+/);
        let s = had;
        if (!s?.shipmentId) {
          const o = await sr(env, store, 'POST', '/orders/create/adhoc', {
            order_id: `S${tx.id}`, order_date: nowIst(), pickup_location: String(env.SHIPROCKET_PICKUP_LOCATION || 'Primary').trim(),
            billing_customer_name: first, billing_last_name: rest.join(' '), billing_address: to.address, billing_city: to.city,
            billing_pincode: pin(to.postalCode, 'Delivery'), billing_state: to.state || to.city, billing_country: 'India',
            billing_email: to.email || undefined, billing_phone: to.phone.replace(/\D/g, '').slice(-10), shipping_is_billing: true,
            order_items: lines(tx).map((i, n) => ({ name: String(i.name).slice(0, 100), sku: String(i.sku || `stratek-${i.id ?? n + 1}`), units: Number(i.qty || 1), selling_price: Number(i.price) })),
            payment_method: 'Prepaid', sub_total: Number(tx.amount), length: 20, breadth: 15, height: 10, weight: kg(fields.weight, 100),
          });
          s = { orderId: o.order_id, shipmentId: o.shipment_id };
          await rememberShipment(store, tx, s);
        }
        const a = await sr(env, store, 'POST', '/courier/assign/awb', { shipment_id: s.shipmentId });
        const d = a.response?.data || {};
        if (!d.awb_code) throw new Error(`Shiprocket could not assign a courier${a.message ? `: ${a.message}` : ''} (check your wallet balance). The order is saved -- press again to retry.`);
        const l = await sr(env, store, 'POST', '/courier/generate/label', { shipment_id: [s.shipmentId] }).catch(() => ({}));
        const labelUrl = /^https:\/\//.test(l.label_url || '') ? l.label_url : null;
        await rememberShipment(store, tx, { ...s, awb: d.awb_code, courier: d.courier_name, labelUrl });
        return bookedResult({ carrier: 'Shiprocket', number: d.awb_code, labelUrl, mode: 'live', extra: d.courier_name ? `Courier: ${d.courier_name}.` : '' });
      },
    },
    {
      id: 'track', label: 'Track Shiprocket shipment', placement: ['transaction'], fields: [],
      async run({ env, context, store }) {
        const tx = sale(context);
        const s = await shipmentFor(store, tx);
        if (!s?.awb) return noShipment('Shiprocket');
        const j = await sr(env, store, 'GET', `/courier/track/awb/${encodeURIComponent(s.awb)}`);
        const t = j.tracking_data || {};
        const cur = t.shipment_track?.[0] || {};
        const act = t.shipment_track_activities?.[0] || {};
        return { type: 'status', title: `Shiprocket ${s.awb}`, status: cur.current_status || 'In the system', text: [s.courier, act.activity, act.location, cur.edd && `arrives ${cur.edd}`].filter(Boolean).join(' · ') };
      },
    },
  ],
};
