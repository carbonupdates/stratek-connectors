// fedex -- FedEx rates, shipments with labels, and tracking (FedEx REST APIs).
// developer.fedex.com -> My projects -> create a project with the Rates, Ship and Track
// APIs, link your FedEx account number. The project has test keys (sandbox) and, once
// FedEx approves it, production keys. Your pickup address is set once below.
//   API: https://apis.fedex.com (test: https://apis-sandbox.fedex.com)
//        POST /oauth/token (client credentials), /rate/v1/rates/quotes, /ship/v1/shipments,
//        /track/v1/trackingnumbers
// Buttons (sale details): Get FedEx rate, Ship with FedEx (needs a person -- it books a paid
// shipment), Track FedEx shipment. The label PDF is kept in this connector and opened from a link.

import { sale } from './_util.js';
import { cc, kg, shipDate, recipientFields, recipient, lines, keepLabel, labelResponse, shipmentFor, rememberShipment, bookedResult, noShipment, readJson, shipperSecrets, shipperFrom, cachedToken } from './_ship.js';

const base = (mode) => (mode === 'test' ? 'https://apis-sandbox.fedex.com' : 'https://apis.fedex.com');

async function token(env, store, mode) {
  return cachedToken(store, `token:${mode}`, async () => {
    const res = await fetch(`${base(mode)}/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', client_id: String(env.FEDEX_CLIENT_ID).trim(), client_secret: String(env.FEDEX_CLIENT_SECRET).trim() }) });
    const j = await readJson(res);
    if (!res.ok || !j?.access_token) throw new Error('FedEx did not accept the API key / secret key (test and production keys are different).');
    return { token: j.access_token, expiresIn: j.expires_in };
  });
}

async function fx(env, store, mode, path, body) {
  const res = await fetch(`${base(mode)}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${await token(env, store, mode)}`, 'Content-Type': 'application/json', 'X-locale': 'en_US' }, body: JSON.stringify(body) });
  const j = await readJson(res);
  if (!res.ok) {
    const e = j?.errors?.[0];
    throw new Error(`FedEx: ${e?.message || e?.code || `error ${res.status}`}`);
  }
  return j;
}

const addr = (a) => ({ streetLines: [a.address.slice(0, 35)].filter(Boolean), city: a.city, ...(a.state ? { stateOrProvinceCode: a.state } : {}), ...(a.postalCode ? { postalCode: a.postalCode } : {}), countryCode: a.country });

export default {
  id: 'fedex',
  name: 'FedEx',
  category: 'delivery',
  status: 'available',
  color: '#4D148C',
  description: 'International and domestic shipping with FedEx: rates, labels and tracking.',
  docsUrl: 'https://developer.fedex.com/api/en-us/home.html',
  test: { support: 'sandbox', note: 'Your FedEx project has separate test keys; test shipments are not collected or charged.' },
  secrets: [
    { name: 'FEDEX_CLIENT_ID', label: 'FedEx API key', hint: 'developer.fedex.com -> My projects -> your project (Rates, Ship, Track APIs).' },
    { name: 'FEDEX_CLIENT_SECRET', label: 'FedEx secret key' },
    { name: 'FEDEX_ACCOUNT_NUMBER', label: 'FedEx account number' },
    ...shipperSecrets('FEDEX', { state: true }),
    { name: 'FEDEX_SERVICE_TYPE', label: 'Service', hint: 'Optional, default INTERNATIONAL_PRIORITY (e.g. INTERNATIONAL_ECONOMY, FEDEX_GROUND).', optional: true },
  ],
  /** GET /pay/fedex/start/:mode/:token -- the shipment's label. */
  payPage: ({ token: t, store }) => labelResponse(store, t, 'fedex'),
  actions: [
    {
      id: 'quote', label: 'Get FedEx rate', placement: ['transaction'],
      fields: [{ name: 'weight', label: 'Weight (kg)', type: 'number', required: true }, { name: 'country', label: 'Destination country code (e.g. US)', type: 'text', required: true }, { name: 'city', label: 'Destination city', type: 'text' }, { name: 'postalCode', label: 'Destination postal code', type: 'text' }],
      async run({ env, fields, store, mode }) {
        const s = shipperFrom(env, 'FEDEX');
        const r = await fx(env, store, mode, '/rate/v1/rates/quotes', {
          accountNumber: { value: String(env.FEDEX_ACCOUNT_NUMBER) },
          requestedShipment: {
            shipper: { address: addr(s) },
            recipient: { address: { city: String(fields.city || ''), ...(fields.postalCode ? { postalCode: String(fields.postalCode) } : {}), countryCode: cc(fields.country, 'Destination') } },
            pickupType: 'DROPOFF_AT_FEDEX_LOCATION', rateRequestType: ['ACCOUNT', 'LIST'], shipDateStamp: shipDate(),
            requestedPackageLineItems: [{ weight: { units: 'KG', value: kg(fields.weight, 68) } }],
          },
        });
        const p = (r.output?.rateReplyDetails || []).map((x) => { const d = x.ratedShipmentDetails?.[0] || {}; return `${x.serviceName || x.serviceType}: ${d.currency || ''} ${d.totalNetCharge ?? '?'}${x.commit?.dateDetail?.dayFormat ? `, arrives ~${String(x.commit.dateDetail.dayFormat).slice(0, 10)}` : ''}`; });
        return { type: 'message', title: 'FedEx rates', text: p.length ? p.join(' · ') : 'FedEx returned no services for this route.' };
      },
    },
    {
      id: 'create_shipment', outbound: true, label: 'Ship with FedEx', placement: ['transaction'], fields: recipientFields({ state: true }),
      async run({ env, fields, context, store, mode, origin }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (had?.number) return bookedResult({ carrier: 'FedEx', number: had.number, labelUrl: had.label ? `${origin}/pay/fedex/start/${mode}/${had.label}` : null, mode, extra: '(already booked for this sale)' });
        const s = shipperFrom(env, 'FEDEX'); const to = recipient(fields, context); const weight = kg(fields.weight, 68);
        const items = lines(tx); const intl = s.country !== to.country;
        const r = await fx(env, store, mode, '/ship/v1/shipments', {
          labelResponseOptions: 'LABEL',
          accountNumber: { value: String(env.FEDEX_ACCOUNT_NUMBER) },
          requestedShipment: {
            shipper: { contact: { personName: s.name, companyName: s.name, phoneNumber: s.phone }, address: addr(s) },
            recipients: [{ contact: { personName: to.name, phoneNumber: to.phone, ...(to.email ? { emailAddress: to.email } : {}) }, address: addr(to) }],
            shipDatestamp: shipDate(),
            serviceType: String(env.FEDEX_SERVICE_TYPE || (intl ? 'INTERNATIONAL_PRIORITY' : 'FEDEX_GROUND')).trim(),
            packagingType: 'YOUR_PACKAGING', pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
            shippingChargesPayment: { paymentType: 'SENDER' },
            labelSpecification: { imageType: 'PDF', labelStockType: 'PAPER_4X6' },
            requestedPackageLineItems: [{ weight: { units: 'KG', value: weight }, customerReferences: [{ customerReferenceType: 'CUSTOMER_REFERENCE', value: `Sale ${tx.id}` }] }],
            ...(intl ? {
              customsClearanceDetail: {
                dutiesPayment: { paymentType: 'RECIPIENT' },
                commodities: items.slice(0, 99).map((i) => ({ description: String(i.name).slice(0, 450), quantity: Number(i.qty || 1), quantityUnits: 'PCS', countryOfManufacture: s.country, weight: { units: 'KG', value: Math.max(0.1, Math.round((weight / items.length) * 10) / 10) }, unitPrice: { amount: Number(i.price), currency: tx.currency }, customsValue: { amount: Number(i.price) * Number(i.qty || 1), currency: tx.currency } })),
              },
            } : {}),
          },
        });
        const t = r.output?.transactionShipments?.[0] || {};
        const number = t.masterTrackingNumber;
        const doc = t.pieceResponses?.[0]?.packageDocuments?.[0];
        const label = doc?.encodedLabel ? await keepLabel(store, { data: doc.encodedLabel, number }) : null;
        await rememberShipment(store, tx, { number, label });
        return bookedResult({ carrier: 'FedEx', number, labelUrl: label ? `${origin}/pay/fedex/start/${mode}/${label}` : doc?.url || null, mode });
      },
    },
    {
      id: 'track', label: 'Track FedEx shipment', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode }) {
        const tx = sale(context);
        const s = await shipmentFor(store, tx);
        if (!s?.number) return noShipment('FedEx');
        const r = await fx(env, store, mode, '/track/v1/trackingnumbers', { includeDetailedScans: false, trackingInfo: [{ trackingNumberInfo: { trackingNumber: s.number } }] });
        const t = r.output?.completeTrackResults?.[0]?.trackResults?.[0] || {};
        const st = t.latestStatusDetail || {};
        return { type: 'status', title: `FedEx ${s.number}`, status: st.statusByLocale || st.description || 'In the system', text: [st.description, st.scanLocation?.city, t.estimatedDeliveryTimeWindow?.window?.ends].filter(Boolean).join(' · ') };
      },
    },
  ],
};
