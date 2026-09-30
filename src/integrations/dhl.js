// dhl -- DHL Express (MyDHL API): international rates, shipments with labels, tracking.
// You need a DHL Express account number and MyDHL API credentials (developer.dhl.com ->
// MyDHL API; DHL gives separate test credentials). Your pickup address is set once below.
//   API: https://express.api.dhl.com/mydhlapi (test: .../mydhlapi/test), basic auth key:secret
//        GET /rates, POST /shipments, GET /shipments/{number}/tracking
// Buttons (sale details): Get DHL rate, Ship with DHL (needs a person -- it books a paid
// shipment), Track DHL shipment. The label PDF is kept in this connector and opened from a link.

import { sale } from './_util.js';
import { randomToken } from './_nepal.js';

const base = (mode) => (mode === 'test' ? 'https://express.api.dhl.com/mydhlapi/test' : 'https://express.api.dhl.com/mydhlapi');

async function dhl(env, mode, method, path, body) {
  const res = await fetch(`${base(mode)}${path}`, { method, headers: { Authorization: `Basic ${btoa(`${String(env.DHL_API_KEY).trim()}:${String(env.DHL_API_SECRET).trim()}`)}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => null);
  if (res.status === 401) throw new Error('DHL did not accept the API key / secret (test and live credentials are different).');
  if (!res.ok) {
    const extra = (j?.additionalDetails || []).slice(0, 3).join('; ');
    throw new Error(`DHL: ${j?.detail || j?.title || `error ${res.status}`}${extra ? ` (${extra})` : ''}`);
  }
  return j;
}

const cc = (v, what) => { const c = String(v || '').trim().toUpperCase(); if (!/^[A-Z]{2}$/.test(c)) throw new Error(`${what}: use the 2-letter country code (e.g. NP, US, GB).`); return c; };
const kg = (v) => { const n = Number(v); if (!Number.isFinite(n) || n <= 0 || n > 300) throw new Error('Weight must be between 0 and 300 kg.'); return Math.round(n * 1000) / 1000; };
const shipDate = () => { const d = new Date(Date.now() + 345 * 60000 + 24 * 3600 * 1000); return d.toISOString().slice(0, 10); };
const shipper = (env) => ({
  postalAddress: { postalCode: String(env.DHL_SHIPPER_POSTAL_CODE || '44600'), cityName: String(env.DHL_SHIPPER_CITY || ''), countryCode: cc(env.DHL_SHIPPER_COUNTRY || 'NP', 'Shipper country'), addressLine1: String(env.DHL_SHIPPER_ADDRESS || '').slice(0, 45) },
  contactInformation: { phone: String(env.DHL_SHIPPER_PHONE || ''), companyName: String(env.DHL_SHIPPER_NAME || 'Shop').slice(0, 100), fullName: String(env.DHL_SHIPPER_NAME || 'Shop').slice(0, 255) },
});

const recipientFields = [
  { name: 'recipientName', label: 'Recipient name', type: 'text', required: true },
  { name: 'recipientPhone', label: 'Recipient phone (with country code)', type: 'tel', required: true },
  { name: 'recipientAddress', label: 'Street address', type: 'text', required: true },
  { name: 'recipientCity', label: 'City', type: 'text', required: true },
  { name: 'recipientPostalCode', label: 'Postal code', type: 'text', required: true },
  { name: 'country', label: 'Country code (e.g. US)', type: 'text', required: true },
  { name: 'weight', label: 'Weight (kg)', type: 'number', required: true },
];

export default {
  id: 'dhl',
  name: 'DHL Express',
  category: 'delivery',
  status: 'available',
  color: '#D40511',
  description: 'International shipping with DHL Express: rates, labels and tracking.',
  docsUrl: 'https://developer.dhl.com/api-reference/dhl-express-mydhl-api',
  test: { support: 'sandbox', note: 'DHL gives separate MyDHL API test credentials; test shipments are not collected or charged.' },
  secrets: [
    { name: 'DHL_API_KEY', label: 'MyDHL API key (username)', hint: 'developer.dhl.com -> MyDHL API -> request access with your DHL Express account.' },
    { name: 'DHL_API_SECRET', label: 'MyDHL API secret (password)' },
    { name: 'DHL_ACCOUNT_NUMBER', label: 'DHL Express account number' },
    { name: 'DHL_SHIPPER_NAME', label: 'Shipper (your business) name' },
    { name: 'DHL_SHIPPER_PHONE', label: 'Shipper phone' },
    { name: 'DHL_SHIPPER_ADDRESS', label: 'Shipper street address' },
    { name: 'DHL_SHIPPER_CITY', label: 'Shipper city', hint: 'e.g. Lalitpur' },
    { name: 'DHL_SHIPPER_POSTAL_CODE', label: 'Shipper postal code', hint: 'e.g. 44700', optional: true },
    { name: 'DHL_SHIPPER_COUNTRY', label: 'Shipper country code', hint: 'Optional, default NP.', optional: true },
  ],
  /** GET /pay/dhl/start/:mode/:token -- the shipment's label PDF. */
  async payPage({ token, store }) {
    const f = await store.get(`label:${token}`);
    if (!f) return new Response('Label not found.', { status: 404 });
    const bin = Uint8Array.from(atob(f.pdf), (c) => c.charCodeAt(0));
    return new Response(bin, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="dhl-${f.number}.pdf"`, 'Cache-Control': 'no-store' } });
  },
  actions: [
    {
      id: 'quote', label: 'Get DHL rate', placement: ['transaction'],
      fields: [{ name: 'weight', label: 'Weight (kg)', type: 'number', required: true }, { name: 'country', label: 'Destination country code (e.g. US)', type: 'text', required: true }, { name: 'city', label: 'Destination city', type: 'text', required: true }, { name: 'postalCode', label: 'Destination postal code', type: 'text' }],
      async run({ env, fields, mode }) {
        const s = shipper(env);
        const q = new URLSearchParams({ accountNumber: env.DHL_ACCOUNT_NUMBER, originCountryCode: s.postalAddress.countryCode, originCityName: s.postalAddress.cityName, originPostalCode: s.postalAddress.postalCode, destinationCountryCode: cc(fields.country, 'Destination'), destinationCityName: String(fields.city), ...(fields.postalCode ? { destinationPostalCode: String(fields.postalCode) } : {}), weight: String(kg(fields.weight)), length: '20', width: '15', height: '10', plannedShippingDate: shipDate(), isCustomsDeclarable: 'true', unitOfMeasurement: 'metric' });
        const r = await dhl(env, mode, 'GET', `/rates?${q}`);
        const p = (r.products || []).map((x) => { const t = (x.totalPrice || []).find((y) => y.currencyType === 'BILLC') || x.totalPrice?.[0]; return `${x.productName}: ${t?.priceCurrency || ''} ${t?.price ?? '?'}${x.deliveryCapabilities?.estimatedDeliveryDateAndTime ? `, arrives ~${String(x.deliveryCapabilities.estimatedDeliveryDateAndTime).slice(0, 10)}` : ''}`; });
        return { type: 'message', title: 'DHL rates', text: p.length ? p.join(' · ') : 'DHL returned no products for this route.' };
      },
    },
    {
      id: 'create_shipment', outbound: true, label: 'Ship with DHL', placement: ['transaction'], fields: recipientFields,
      async run({ env, fields, context, store, mode, origin }) {
        const tx = sale(context);
        const existing = await store.get(`tx:${tx.id}`);
        if (existing?.number) return { type: 'link', title: 'Already shipped with DHL', text: `Waybill ${existing.number}.`, url: `${origin}/pay/dhl/start/${mode}/${existing.label}`, linkLabel: 'Open label' };
        const weight = kg(fields.weight);
        const items = (tx.items || []).length ? tx.items : [{ name: `Goods (sale #${tx.id})`, price: Number(tx.amount), qty: 1 }];
        const totalQty = items.reduce((s, i) => s + Number(i.qty || 1), 0) || 1;
        const body = {
          plannedShippingDateAndTime: `${shipDate()}T11:00:00 GMT+05:45`,
          pickup: { isRequested: false },
          productCode: 'P',
          accounts: [{ typeCode: 'shipper', number: String(env.DHL_ACCOUNT_NUMBER) }],
          customerDetails: {
            shipperDetails: shipper(env),
            receiverDetails: {
              postalAddress: { postalCode: String(fields.recipientPostalCode), cityName: String(fields.recipientCity), countryCode: cc(fields.country, 'Destination'), addressLine1: String(fields.recipientAddress).slice(0, 45) },
              contactInformation: { phone: String(fields.recipientPhone), companyName: String(fields.recipientName).slice(0, 100), fullName: String(fields.recipientName).slice(0, 255) },
            },
          },
          content: {
            packages: [{ weight, dimensions: { length: 20, width: 15, height: 10 } }],
            isCustomsDeclarable: true,
            declaredValue: Number(tx.amount), declaredValueCurrency: tx.currency,
            description: items.map((i) => i.name).join(', ').slice(0, 70) || 'Goods',
            incoterm: 'DAP', unitOfMeasurement: 'metric',
            exportDeclaration: {
              lineItems: items.slice(0, 50).map((i, n) => ({ number: n + 1, description: String(i.name).slice(0, 512), price: Number(i.price), quantity: { value: Number(i.qty || 1), unitOfMeasurement: 'PCS' }, exportReasonType: 'permanent', manufacturerCountry: shipper(env).postalAddress.countryCode, weight: { netValue: Math.round((weight / totalQty) * Number(i.qty || 1) * 1000) / 1000, grossValue: Math.round((weight / totalQty) * Number(i.qty || 1) * 1000) / 1000 } })),
              invoice: { number: `S${tx.id}`, date: shipDate() },
            },
          },
          outputImageProperties: { imageOptions: [{ typeCode: 'label', templateName: 'ECOM26_84_001', isRequested: true }] },
        };
        const r = await dhl(env, mode, 'POST', '/shipments', body);
        const number = r.shipmentTrackingNumber;
        const pdf = (r.documents || []).find((d) => d.typeCode === 'label')?.content;
        const label = randomToken(16);
        if (pdf) await store.put(`label:${label}`, { pdf, number });
        await store.put(`tx:${tx.id}`, { number, label: pdf ? label : null, at: new Date().toISOString() });
        return pdf
          ? { type: 'link', title: `DHL waybill ${number}`, text: `Shipment booked${mode === 'test' ? ' (TEST)' : ''}. Print the label and hand the parcel to DHL.`, url: `${origin}/pay/dhl/start/${mode}/${label}`, linkLabel: 'Open label (PDF)' }
          : { type: 'status', title: 'DHL', status: 'Booked', text: `Waybill ${number}.` };
      },
    },
    {
      id: 'track', label: 'Track DHL shipment', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode }) {
        const tx = sale(context);
        const s = await store.get(`tx:${tx.id}`);
        if (!s?.number) return { type: 'message', title: 'No DHL shipment', text: 'This sale was not shipped with DHL from Stratek.' };
        const r = await dhl(env, mode, 'GET', `/shipments/${encodeURIComponent(s.number)}/tracking?trackingView=last-checkpoint`);
        const ev = r.shipments?.[0]?.events?.[0] || {};
        return { type: 'status', title: `DHL ${s.number}`, status: r.shipments?.[0]?.status || ev.description || 'In the system', text: [ev.description, ev.serviceArea?.[0]?.description, ev.date].filter(Boolean).join(' · ') };
      },
    },
  ],
};
