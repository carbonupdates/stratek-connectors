// aramex -- Aramex rates, shipments with labels, and tracking (Aramex web services, JSON).
// Your Aramex account manager gives you the API username / password, account number,
// PIN and entity (e.g. KTM for Kathmandu). Test credentials work on Aramex's test system.
//   API: https://ws.aramex.net/ShippingAPI.V2 (test: https://ws.dev.aramex.net/ShippingAPI.V2)
//        RateCalculator/Service_1_0.svc/json/CalculateRate, Shipping/Service_1_0.svc/json/CreateShipments,
//        Tracking/Service_1_0.svc/json/TrackShipments
// Buttons (sale details): Get Aramex rate, Ship with Aramex (needs a person -- it books a paid
// shipment), Track Aramex shipment. Aramex hosts the label; the button opens it.

import { sale } from './_util.js';
import { cc, kg, recipientFields, recipient, lines, shipmentFor, rememberShipment, bookedResult, noShipment, readJson, shipperSecrets, shipperFrom } from './_ship.js';

const base = (mode) => (mode === 'test' ? 'https://ws.dev.aramex.net/ShippingAPI.V2' : 'https://ws.aramex.net/ShippingAPI.V2');

const clientInfo = (env) => ({
  UserName: String(env.ARAMEX_USERNAME).trim(), Password: String(env.ARAMEX_PASSWORD).trim(), Version: 'v1.0',
  AccountNumber: String(env.ARAMEX_ACCOUNT_NUMBER).trim(), AccountPin: String(env.ARAMEX_ACCOUNT_PIN).trim(),
  AccountEntity: String(env.ARAMEX_ENTITY).trim().toUpperCase(), AccountCountryCode: cc(env.ARAMEX_COUNTRY || 'NP', 'Account country'), Source: 24,
});

async function ax(env, mode, service, op, body) {
  const res = await fetch(`${base(mode)}/${service}/Service_1_0.svc/json/${op}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ ClientInfo: clientInfo(env), ...body }) });
  const j = await readJson(res);
  const notes = [...(j?.Notifications || []), ...((j?.Shipments || []).flatMap((s) => s.Notifications || []))];
  if (!res.ok || j?.HasErrors) throw new Error(`Aramex: ${notes.map((n) => n.Message).filter(Boolean).slice(0, 3).join('; ') || `error ${res.status}`}`);
  return j;
}

const party = (a, account) => ({
  ...(account ? { AccountNumber: account } : {}),
  PartyAddress: { Line1: a.address.slice(0, 50), City: a.city, ...(a.state ? { StateOrProvinceCode: a.state } : {}), PostCode: a.postalCode || '', CountryCode: a.country },
  Contact: { PersonName: a.name.slice(0, 50), CompanyName: a.name.slice(0, 50), PhoneNumber1: a.phone, CellPhone: a.phone, EmailAddress: a.email || '' },
});
const details = (from, to, weight) => {
  const dom = from.country === to.country;
  return { ActualWeight: { Unit: 'KG', Value: weight }, ChargeableWeight: { Unit: 'KG', Value: weight }, NumberOfPieces: 1, ProductGroup: dom ? 'DOM' : 'EXP', ProductType: dom ? 'ONP' : 'PPX', PaymentType: 'P' };
};
const httpsUrl = (u) => (u ? String(u).replace(/^http:\/\//i, 'https://') : null);

export default {
  id: 'aramex',
  name: 'Aramex',
  category: 'delivery',
  status: 'available',
  color: '#E30613',
  description: 'International courier with Aramex: rates, shipments and tracking.',
  docsUrl: 'https://www.aramex.com/us/en/developers-solution-center',
  test: { support: 'sandbox', note: 'Aramex gives test credentials for its test system; test shipments are not collected or charged.' },
  secrets: [
    { name: 'ARAMEX_USERNAME', label: 'Aramex API username', hint: 'From your Aramex account manager.' },
    { name: 'ARAMEX_PASSWORD', label: 'Aramex API password' },
    { name: 'ARAMEX_ACCOUNT_NUMBER', label: 'Aramex account number' },
    { name: 'ARAMEX_ACCOUNT_PIN', label: 'Account PIN' },
    { name: 'ARAMEX_ENTITY', label: 'Account entity', hint: 'e.g. KTM' },
    { name: 'ARAMEX_COUNTRY', label: 'Account country code', hint: 'Optional, default NP.', optional: true },
    ...shipperSecrets('ARAMEX'),
  ],
  actions: [
    {
      id: 'quote', label: 'Get Aramex rate', placement: ['transaction'],
      fields: [{ name: 'weight', label: 'Weight (kg)', type: 'number', required: true }, { name: 'country', label: 'Destination country code (e.g. US)', type: 'text', required: true }, { name: 'city', label: 'Destination city', type: 'text', required: true }, { name: 'postalCode', label: 'Destination postal code', type: 'text' }],
      async run({ env, fields, context, mode }) {
        const s = shipperFrom(env, 'ARAMEX');
        const to = { address: '', city: String(fields.city || ''), postalCode: String(fields.postalCode || ''), country: cc(fields.country, 'Destination') };
        const r = await ax(env, mode, 'RateCalculator', 'CalculateRate', {
          OriginAddress: { Line1: s.address, City: s.city, PostCode: s.postalCode, CountryCode: s.country },
          DestinationAddress: { Line1: '', City: to.city, PostCode: to.postalCode, CountryCode: to.country },
          ShipmentDetails: details(s, to, kg(fields.weight)),
          PreferredCurrencyCode: String(context?.transaction?.currency || 'NPR').toUpperCase(),
          Transaction: { Reference1: 'Stratek quote' },
        });
        const t = r.TotalAmount || {};
        return { type: 'message', title: 'Aramex rate', text: `${s.country === to.country ? 'Domestic' : 'Priority parcel'}: ${t.CurrencyCode || ''} ${t.Value ?? '?'}` };
      },
    },
    {
      id: 'create_shipment', outbound: true, label: 'Ship with Aramex', placement: ['transaction'], fields: recipientFields(),
      async run({ env, fields, context, store, mode }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (had?.number) return bookedResult({ carrier: 'Aramex', number: had.number, labelUrl: had.labelUrl, mode, extra: '(already booked for this sale)' });
        const s = shipperFrom(env, 'ARAMEX'); const to = recipient(fields, context);
        const now = Date.now();
        const r = await ax(env, mode, 'Shipping', 'CreateShipments', {
          LabelInfo: { ReportID: 9201, ReportType: 'URL' },
          Shipments: [{
            Reference1: `Sale ${tx.id}`,
            Shipper: party(s, String(env.ARAMEX_ACCOUNT_NUMBER).trim()),
            Consignee: party(to),
            ShippingDateTime: `/Date(${now})/`, DueDate: `/Date(${now + 5 * 86400000})/`,
            Details: { ...details(s, to, kg(fields.weight)), DescriptionOfGoods: lines(tx).map((i) => i.name).join(', ').slice(0, 100) || 'Goods', GoodsOriginCountry: s.country, ...(s.country !== to.country ? { CustomsValueAmount: { CurrencyCode: tx.currency, Value: Number(tx.amount) } } : {}) },
          }],
          Transaction: { Reference1: `Sale ${tx.id}` },
        });
        const sh = r.Shipments?.[0] || {};
        const labelUrl = httpsUrl(sh.ShipmentLabel?.LabelURL);
        await rememberShipment(store, tx, { number: sh.ID, labelUrl });
        return bookedResult({ carrier: 'Aramex', number: sh.ID, labelUrl, mode });
      },
    },
    {
      id: 'track', label: 'Track Aramex shipment', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode }) {
        const tx = sale(context);
        const s = await shipmentFor(store, tx);
        if (!s?.number) return noShipment('Aramex');
        const r = await ax(env, mode, 'Tracking', 'TrackShipments', { Shipments: [String(s.number)], GetLastTrackingUpdateOnly: true, Transaction: { Reference1: `Sale ${tx.id}` } });
        const u = r.TrackingResults?.[0]?.Value?.[0] || {};
        return { type: 'status', title: `Aramex ${s.number}`, status: u.UpdateDescription || 'In the system', text: [u.UpdateLocation, u.Comments].filter(Boolean).join(' · ') };
      },
    },
  ],
};
