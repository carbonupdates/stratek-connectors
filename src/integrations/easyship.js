// easyship -- compare couriers and buy labels through Easyship (one account, many carriers).
// Easyship dashboard -> Connect -> API integration -> create a token with the scopes
// rate:read, shipment:write, label:write. A sandbox token (starts with "sand_") is saved
// under Test keys. Your pickup address is set once below.
//   API: https://public-api.easyship.com/2024-09 (Bearer token)
//        POST /rates, POST /shipments (buy_label), GET /shipments/{id}
// Buttons (sale details): Compare Easyship rates, Ship with Easyship (needs a person -- it
// buys a label from your Easyship balance), Track Easyship shipment.

import { sale } from './_util.js';
import { cc, kg, recipientFields, recipient, lines, keepLabel, labelResponse, shipmentFor, rememberShipment, bookedResult, noShipment, readJson, shipperSecrets, shipperFrom } from './_ship.js';

const BASE = 'https://public-api.easyship.com/2024-09';

async function es(env, method, path, body) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { Authorization: `Bearer ${String(env.EASYSHIP_TOKEN).trim()}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 401) throw new Error('Easyship did not accept the API token.');
  if (res.status === 402) throw new Error('Easyship: not enough balance or no payment method -- top up in Easyship.');
  if (!res.ok) throw new Error(`Easyship: ${[].concat(j?.error?.details || j?.error?.message || j?.message || `error ${res.status}`).join('; ').slice(0, 300)}`);
  return j;
}

const address = (a) => ({ line_1: a.address.slice(0, 35), city: a.city, ...(a.state ? { state: a.state } : {}), ...(a.postalCode ? { postal_code: a.postalCode } : {}), country_alpha2: a.country, contact_name: a.name, ...(a.phone ? { contact_phone: a.phone } : {}), ...(a.email ? { contact_email: a.email } : {}), ...(a.company ? { company_name: a.company } : {}) });
const parcels = (env, tx, weight) => {
  const items = lines(tx);
  return [{ total_actual_weight: weight, box: { length: 20, width: 15, height: 10 }, items: items.slice(0, 50).map((i) => ({ description: String(i.name).slice(0, 200), quantity: Number(i.qty || 1), declared_currency: tx.currency, declared_customs_value: Number(i.price), hs_code: String(env.EASYSHIP_HS_CODE || '').trim() || undefined, origin_country_alpha2: shipperFrom(env, 'EASYSHIP').country })) }];
};
const fromOf = (env) => ({ ...shipperFrom(env, 'EASYSHIP'), company: shipperFrom(env, 'EASYSHIP').name, email: String(env.EASYSHIP_SHIPPER_EMAIL || '').trim() });
const rateLine = (r) => `${r.courier_service?.name || r.courier_name || 'Courier'}: ${r.currency || ''} ${r.total_charge ?? '?'}${r.min_delivery_time ? `, ${r.min_delivery_time}-${r.max_delivery_time} days` : ''}`;

export default {
  id: 'easyship',
  name: 'Easyship',
  category: 'delivery',
  status: 'available',
  color: '#2F2F8F',
  description: 'Compare 250+ couriers and buy labels through one Easyship account.',
  docsUrl: 'https://developers.easyship.com/',
  test: { support: 'sandbox', note: 'Save a sandbox token (starts with "sand_") under Test keys; sandbox labels are free and not real.' },
  secrets: [
    { name: 'EASYSHIP_TOKEN', label: 'Easyship API token', hint: 'Easyship -> Connect -> API integration -> token with rate:read, shipment:write, label:write.' },
    ...shipperSecrets('EASYSHIP', { state: true }),
    { name: 'EASYSHIP_SHIPPER_EMAIL', label: 'Shipper email', optional: true },
    { name: 'EASYSHIP_HS_CODE', label: 'HS code of what you usually ship', hint: 'For customs, e.g. 0709.59 (mushrooms), 6109.10 (T-shirts).', optional: true },
  ],
  /** GET /pay/easyship/start/:mode/:token -- a label Easyship sent as a file. */
  payPage: ({ token: t, store }) => labelResponse(store, t, 'easyship'),
  actions: [
    {
      id: 'quote', label: 'Compare Easyship rates', placement: ['transaction'],
      fields: [{ name: 'weight', label: 'Weight (kg)', type: 'number', required: true }, { name: 'country', label: 'Destination country code (e.g. US)', type: 'text', required: true }, { name: 'city', label: 'Destination city', type: 'text' }, { name: 'state', label: 'State code (US, CA, AU...)', type: 'text' }, { name: 'postalCode', label: 'Destination postal code', type: 'text' }],
      async run({ env, fields, context }) {
        const tx = sale(context);
        const to = { address: '', name: 'Recipient', city: String(fields.city || ''), state: String(fields.state || '').toUpperCase(), postalCode: String(fields.postalCode || ''), country: cc(fields.country, 'Destination') };
        const r = await es(env, 'POST', '/rates', { origin_address: address(fromOf(env)), destination_address: address(to), incoterms: 'DDU', parcels: parcels(env, tx, kg(fields.weight, 70)) });
        const rates = (r.rates || []).slice(0, 5);
        return { type: 'message', title: 'Easyship rates', text: rates.length ? rates.map(rateLine).join(' · ') : 'No couriers for this route.' };
      },
    },
    {
      id: 'create_shipment', outbound: true, label: 'Ship with Easyship', placement: ['transaction'],
      fields: [...recipientFields({ state: true }), { name: 'courierServiceId', label: 'Courier service ID (optional -- empty picks the best value)', type: 'text' }],
      async run({ env, fields, context, store, mode, origin }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (had?.id) return bookedResult({ carrier: 'Easyship', number: had.number || had.id, labelUrl: had.labelUrl || (had.label ? `${origin}/pay/easyship/start/${mode}/${had.label}` : null), mode, extra: '(already booked for this sale)' });
        const to = recipient(fields, context);
        const r = await es(env, 'POST', '/shipments', {
          origin_address: address(fromOf(env)), destination_address: address(to), incoterms: 'DDU',
          metadata: { stratek_sale: tx.id }, order_data: { platform_order_number: `S${tx.id}` },
          ...(fields.courierServiceId ? { courier_settings: { courier_service_id: String(fields.courierServiceId).trim(), allow_fallback: false } } : {}),
          shipping_settings: { buy_label: true, buy_label_synchronous: true, printing_options: { format: 'pdf', label: '4x6' } },
          parcels: parcels(env, tx, kg(fields.weight, 70)),
        });
        const s = r.shipment || {};
        const number = s.trackings?.[0]?.tracking_number || s.easyship_shipment_id;
        const doc = (s.shipping_documents || []).find((d) => d.category === 'label') || {};
        let labelUrl = /^https:\/\//.test(doc.url || '') ? doc.url : null;
        let label = null;
        if (!labelUrl && doc.base64_encoded_strings?.[0]) { label = await keepLabel(store, { data: doc.base64_encoded_strings[0], number }); labelUrl = `${origin}/pay/easyship/start/${mode}/${label}`; }
        await rememberShipment(store, tx, { id: s.easyship_shipment_id, number, labelUrl: label ? null : labelUrl, label });
        const courier = s.courier_service?.name || s.courier?.name;
        return bookedResult({ carrier: 'Easyship', number, labelUrl, mode, extra: [courier && `Courier: ${courier}.`, s.label_state && s.label_state !== 'generated' ? `Label: ${s.label_state}.` : ''].filter(Boolean).join(' ') });
      },
    },
    {
      id: 'track', label: 'Track Easyship shipment', placement: ['transaction'], fields: [],
      async run({ env, context, store }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (!had?.id) return noShipment('Easyship');
        const s = (await es(env, 'GET', `/shipments/${encodeURIComponent(had.id)}`)).shipment || {};
        const t = s.trackings?.[0] || {};
        return { type: 'status', title: `Easyship ${t.tracking_number || had.id}`, status: t.tracking_state || s.shipment_state || 'In the system', text: [s.courier_service?.name, t.leg_number ? `leg ${t.leg_number}` : '', s.delivery_state].filter(Boolean).join(' · ') };
      },
    },
  ],
};
