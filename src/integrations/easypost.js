// easypost -- rates, labels and tracking across 100+ carriers with one EasyPost account.
// easypost.com -> Account -> API keys: Production key (Test key under Test keys -- test
// labels are free and not real).
//   API: https://api.easypost.com/v2 (basic auth, key as username)
//        POST /shipments (rates), POST /shipments/{id}/buy, GET /trackers/{id}
// Buttons (sale details): Get EasyPost rates, Ship with EasyPost (needs a person -- buys the
// cheapest label, or the one you pick), Track EasyPost shipment. Weights go to EasyPost in ounces.

import { sale } from './_util.js';
import { kg, recipientFields, recipient, lines, shipmentFor, rememberShipment, bookedResult, noShipment, readJson, shipperSecrets, shipperFrom } from './_ship.js';

async function ep(env, method, path, body) {
  const res = await fetch(`https://api.easypost.com/v2${path}`, { method, headers: { Authorization: `Basic ${btoa(`${String(env.EASYPOST_API_KEY).trim()}:`)}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 401) throw new Error('EasyPost did not accept the API key (test and production keys are different).');
  if (!res.ok) throw new Error(`EasyPost: ${j?.error?.message || `error ${res.status}`}${j?.error?.errors?.length ? ` (${j.error.errors.map((e) => e.message || e).join('; ').slice(0, 150)})` : ''}`);
  return j || {};
}

const oz = (kgs) => Math.round(kgs * 35.274 * 10) / 10;
const addr = (a) => ({ name: a.name, ...(a.company ? { company: a.company } : {}), street1: a.address.slice(0, 50), city: a.city, ...(a.state ? { state: a.state } : {}), zip: a.postalCode || '', country: a.country, ...(a.phone ? { phone: a.phone } : {}), ...(a.email ? { email: a.email } : {}) });

async function shipment(env, tx, from, to, weight) {
  const items = lines(tx);
  const intl = from.country !== to.country;
  const s = await ep(env, 'POST', '/shipments', { shipment: {
    from_address: addr(from), to_address: addr(to), parcel: { length: 20 / 2.54, width: 15 / 2.54, height: 10 / 2.54, weight: oz(weight) },
    reference: `Stratek sale ${tx.id}`, options: { label_format: 'PDF' },
    ...(intl ? { customs_info: { contents_type: 'merchandise', customs_certify: true, customs_signer: from.name, eel_pfc: 'NOEEI 30.37(a)', non_delivery_option: 'return', restriction_type: 'none', customs_items: items.slice(0, 20).map((i) => ({ description: String(i.name).slice(0, 45), quantity: Number(i.qty || 1), value: Number(i.price) * Number(i.qty || 1), currency: tx.currency, weight: Math.max(0.1, oz(weight / items.length)), origin_country: from.country, ...(env.EASYPOST_HS_CODE ? { hs_tariff_number: String(env.EASYPOST_HS_CODE).trim() } : {}) })) } } : {}),
  } });
  return { id: s.id, rates: (s.rates || []).sort((a, b) => Number(a.rate) - Number(b.rate)), messages: s.messages || [] };
}
const rateLine = (r) => `${r.carrier} ${r.service}: ${r.currency} ${r.rate}${r.delivery_days ? `, ~${r.delivery_days} days` : ''}`;

export default {
  id: 'easypost',
  name: 'EasyPost',
  category: 'delivery',
  status: 'available',
  color: '#2B64E8',
  description: 'Rates, labels and tracking across 100+ carriers with one EasyPost account.',
  docsUrl: 'https://docs.easypost.com/',
  test: { support: 'sandbox', note: 'Save your EasyPost Test key under Test keys: test labels are free and not valid for shipping.' },
  secrets: [
    { name: 'EASYPOST_API_KEY', label: 'EasyPost API key', hint: 'easypost.com -> Account -> API keys -> Production key.' },
    ...shipperSecrets('EASYPOST', { state: true }),
    { name: 'EASYPOST_HS_CODE', label: 'HS code of what you usually ship', hint: 'Optional, for customs on international parcels.', optional: true },
  ],
  actions: [
    {
      id: 'quote', label: 'Get EasyPost rates', placement: ['transaction'], fields: recipientFields({ state: true }),
      async run({ env, fields, context }) {
        const tx = sale(context);
        const s = await shipment(env, tx, shipperFrom(env, 'EASYPOST'), recipient(fields, context), kg(fields.weight, 70));
        return { type: 'message', title: 'EasyPost rates', text: s.rates.length ? s.rates.slice(0, 6).map(rateLine).join(' · ') : `No rates${s.messages.length ? `: ${s.messages.map((m) => `${m.carrier} ${m.message}`).join('; ').slice(0, 200)}` : ' -- add carrier accounts in EasyPost.'}` };
      },
    },
    {
      id: 'create_shipment', outbound: true, label: 'Ship with EasyPost', placement: ['transaction'],
      fields: [...recipientFields({ state: true }), { name: 'service', label: 'Carrier / service (optional, e.g. "USPS Priority" -- empty = cheapest)', type: 'text' }],
      async run({ env, fields, context, store, mode }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (had?.number) return bookedResult({ carrier: had.carrier || 'EasyPost', number: had.number, labelUrl: had.labelUrl, mode, extra: '(already booked for this sale)' });
        const s = await shipment(env, tx, shipperFrom(env, 'EASYPOST'), recipient(fields, context), kg(fields.weight, 70));
        const want = String(fields.service || '').trim().toLowerCase();
        const rate = want ? s.rates.find((r) => `${r.carrier} ${r.service}`.toLowerCase().includes(want)) : s.rates[0];
        if (!rate) throw new Error(want ? `No rate matches "${fields.service}". Press "Get EasyPost rates" to see the choices.` : 'No carrier rates for this route.');
        const b = await ep(env, 'POST', `/shipments/${encodeURIComponent(s.id)}/buy`, { rate: { id: rate.id } });
        const labelUrl = /^https:\/\//.test(b.postage_label?.label_pdf_url || b.postage_label?.label_url || '') ? (b.postage_label.label_pdf_url || b.postage_label.label_url) : null;
        await rememberShipment(store, tx, { number: b.tracking_code, carrier: rate.carrier, trackerId: b.tracker?.id, shipmentId: s.id, labelUrl, publicUrl: b.tracker?.public_url || null });
        return bookedResult({ carrier: rate.carrier, number: b.tracking_code, labelUrl, mode, extra: `${rate.service} -- ${rate.currency} ${rate.rate}.` });
      },
    },
    {
      id: 'track', label: 'Track EasyPost shipment', placement: ['transaction'], fields: [],
      async run({ env, context, store }) {
        const tx = sale(context);
        const s = await shipmentFor(store, tx);
        if (!s?.number) return noShipment('EasyPost');
        const t = s.trackerId ? await ep(env, 'GET', `/trackers/${encodeURIComponent(s.trackerId)}`) : {};
        const last = (t.tracking_details || []).at(-1) || {};
        return { type: 'status', title: `${s.carrier || 'EasyPost'} ${s.number}`, status: t.status || 'pre_transit', text: [last.message, last.tracking_location?.city, t.est_delivery_date && `ETA ${String(t.est_delivery_date).slice(0, 10)}`, s.publicUrl].filter(Boolean).join(' · ') };
      },
    },
  ],
};
