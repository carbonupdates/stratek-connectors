// shippo -- rates, labels and tracking across 40+ carriers (USPS, UPS, FedEx, DHL, Canada Post,
// Royal Mail, Australia Post...) with one Shippo account and your own or Shippo's rates.
// apps.goshippo.com -> Settings -> API -> Live token (shippo_live_...; shippo_test_... under
// Test keys -- test labels are free and not real).
//   API: https://api.goshippo.com (header Authorization: ShippoToken <token>)
//        POST /shipments (rates), POST /transactions (buy label), GET /tracks/{carrier}/{number}
// Buttons (sale details): Get Shippo rates, Ship with Shippo (needs a person -- buys the
// cheapest label, or the one you pick), Track Shippo shipment.

import { sale } from './_util.js';
import { cc, kg, recipientFields, recipient, lines, shipmentFor, rememberShipment, bookedResult, noShipment, readJson, shipperSecrets, shipperFrom } from './_ship.js';

async function sh(env, method, path, body) {
  const res = await fetch(`https://api.goshippo.com${path}`, { method, headers: { Authorization: `ShippoToken ${String(env.SHIPPO_TOKEN).trim()}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 401) throw new Error('Shippo did not accept the API token (test and live tokens are different).');
  if (!res.ok) throw new Error(`Shippo: ${j?.detail || JSON.stringify(j?.messages || j || '').slice(0, 200) || `error ${res.status}`}`);
  return j || {};
}

const addr = (a) => ({ name: a.name, ...(a.company ? { company: a.company } : {}), street1: a.address.slice(0, 50), city: a.city, ...(a.state ? { state: a.state } : {}), zip: a.postalCode || '', country: a.country, ...(a.phone ? { phone: a.phone } : {}), ...(a.email ? { email: a.email } : {}) });
const parcel = (w) => ({ length: '20', width: '15', height: '10', distance_unit: 'cm', weight: String(w), mass_unit: 'kg' });

function customs(env, tx, from, weight) {
  const items = lines(tx);
  return {
    contents_type: 'MERCHANDISE', non_delivery_option: 'RETURN', certify: true, certify_signer: from.name, incoterm: 'DDU',
    items: items.slice(0, 20).map((i) => ({ description: String(i.name).slice(0, 45), quantity: Number(i.qty || 1), net_weight: String(Math.max(0.01, Math.round((weight / items.length) * 100) / 100)), mass_unit: 'kg', value_amount: String(Number(i.price) * Number(i.qty || 1)), value_currency: tx.currency, origin_country: from.country, ...(env.SHIPPO_HS_CODE ? { tariff_number: String(env.SHIPPO_HS_CODE).trim() } : {}) })),
  };
}

async function rates(env, tx, from, to, weight) {
  const s = await sh(env, 'POST', '/shipments', { address_from: addr(from), address_to: addr(to), parcels: [parcel(weight)], async: false, ...(from.country !== to.country ? { customs_declaration: customs(env, tx, from, weight) } : {}), metadata: `Stratek sale ${tx.id}` });
  return (s.rates || []).filter((r) => r.object_id).sort((a, b) => Number(a.amount) - Number(b.amount));
}
const rateLine = (r) => `${r.provider} ${r.servicelevel?.name || ''}: ${r.currency} ${r.amount}${r.estimated_days ? `, ~${r.estimated_days} days` : ''}`;

export default {
  id: 'shippo',
  name: 'Shippo',
  category: 'delivery',
  status: 'available',
  color: '#1D2B36',
  description: 'Rates, labels and tracking across 40+ carriers with one Shippo account.',
  docsUrl: 'https://docs.goshippo.com/shippoapi/public-api/',
  test: { support: 'sandbox', note: 'Save a shippo_test_ token under Test keys: test labels are free and not valid for shipping.' },
  secrets: [
    { name: 'SHIPPO_TOKEN', label: 'Shippo API token', hint: 'apps.goshippo.com -> Settings -> API -> Live token (shippo_live_...).' },
    ...shipperSecrets('SHIPPO', { state: true }),
    { name: 'SHIPPO_SHIPPER_EMAIL', label: 'Shipper email', optional: true },
    { name: 'SHIPPO_HS_CODE', label: 'HS code of what you usually ship', hint: 'Optional, for customs on international parcels.', optional: true },
  ],
  actions: [
    {
      id: 'quote', label: 'Get Shippo rates', placement: ['transaction'], fields: recipientFields({ state: true }),
      async run({ env, fields, context }) {
        const tx = sale(context);
        const from = { ...shipperFrom(env, 'SHIPPO'), email: String(env.SHIPPO_SHIPPER_EMAIL || '').trim() };
        const list = await rates(env, tx, from, recipient(fields, context), kg(fields.weight, 70));
        return { type: 'message', title: 'Shippo rates', text: list.length ? list.slice(0, 6).map(rateLine).join(' · ') : 'No carrier rates for this route -- connect carriers in Shippo.' };
      },
    },
    {
      id: 'create_shipment', outbound: true, label: 'Ship with Shippo', placement: ['transaction'],
      fields: [...recipientFields({ state: true }), { name: 'service', label: 'Carrier / service (optional, e.g. "USPS Priority" -- empty = cheapest)', type: 'text' }],
      async run({ env, fields, context, store, mode }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (had?.number) return bookedResult({ carrier: had.carrier || 'Shippo', number: had.number, labelUrl: had.labelUrl, mode, extra: '(already booked for this sale)' });
        const from = { ...shipperFrom(env, 'SHIPPO'), email: String(env.SHIPPO_SHIPPER_EMAIL || '').trim() };
        const list = await rates(env, tx, from, recipient(fields, context), kg(fields.weight, 70));
        const want = String(fields.service || '').trim().toLowerCase();
        const rate = want ? list.find((r) => `${r.provider} ${r.servicelevel?.name || ''}`.toLowerCase().includes(want)) : list[0];
        if (!rate) throw new Error(want ? `No rate matches "${fields.service}". Press "Get Shippo rates" to see the choices.` : 'No carrier rates for this route.');
        const t = await sh(env, 'POST', '/transactions', { rate: rate.object_id, label_file_type: 'PDF', async: false, metadata: `Stratek sale ${tx.id}` });
        if (t.status !== 'SUCCESS') throw new Error(`Shippo could not buy the label: ${(t.messages || []).map((m) => m.text).join('; ') || t.status}`);
        const labelUrl = /^https:\/\//.test(t.label_url || '') ? t.label_url : null;
        await rememberShipment(store, tx, { number: t.tracking_number, carrier: rate.provider, token: String(rate.provider || '').toLowerCase().replace(/\s+/g, '_'), labelUrl });
        return bookedResult({ carrier: `${rate.provider}`, number: t.tracking_number, labelUrl, mode, extra: `${rate.servicelevel?.name || ''} -- ${rate.currency} ${rate.amount}.` });
      },
    },
    {
      id: 'track', label: 'Track Shippo shipment', placement: ['transaction'], fields: [],
      async run({ env, context, store }) {
        const tx = sale(context);
        const s = await shipmentFor(store, tx);
        if (!s?.number) return noShipment('Shippo');
        const t = await sh(env, 'GET', `/tracks/${encodeURIComponent(s.token || 'shippo')}/${encodeURIComponent(s.number)}`);
        const st = t.tracking_status || {};
        return { type: 'status', title: `${s.carrier || 'Shippo'} ${s.number}`, status: st.status || 'UNKNOWN', text: [st.status_details, st.location?.city, t.eta && `ETA ${String(t.eta).slice(0, 10)}`].filter(Boolean).join(' · ') };
      },
    },
  ],
};
