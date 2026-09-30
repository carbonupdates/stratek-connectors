// ups -- UPS rates, shipments with labels, and tracking (UPS REST APIs).
// developer.ups.com -> Apps -> add an app with Rating, Shipping and Tracking, linked to
// your UPS account (shipper) number. The same keys work on the test site (CIE).
//   API: https://onlinetools.ups.com (test: https://wwwcie.ups.com)
//        POST /security/v1/oauth/token (basic client:secret), /api/rating/v2409/Shop,
//        /api/shipments/v2409/ship, GET /api/track/v1/details/{number}
// Buttons (sale details): Get UPS rate, Ship with UPS (needs a person -- it books a paid
// shipment), Track UPS shipment. The label image is kept in this connector.

import { sale } from './_util.js';
import { cc, kg, recipientFields, recipient, lines, keepLabel, labelResponse, shipmentFor, rememberShipment, bookedResult, noShipment, readJson, shipperSecrets, shipperFrom, cachedToken } from './_ship.js';
import { randomToken } from './_nepal.js';

const base = (mode) => (mode === 'test' ? 'https://wwwcie.ups.com' : 'https://onlinetools.ups.com');
const SERVICES = { '01': 'Next Day Air', '02': '2nd Day Air', '03': 'Ground', '07': 'Worldwide Express', '08': 'Worldwide Expedited', '11': 'Standard', '12': '3 Day Select', '54': 'Worldwide Express Plus', '65': 'Worldwide Saver' };

async function token(env, store, mode) {
  return cachedToken(store, `token:${mode}`, async () => {
    const res = await fetch(`${base(mode)}/security/v1/oauth/token`, { method: 'POST', headers: { Authorization: `Basic ${btoa(`${String(env.UPS_CLIENT_ID).trim()}:${String(env.UPS_CLIENT_SECRET).trim()}`)}`, 'Content-Type': 'application/x-www-form-urlencoded', 'x-merchant-id': String(env.UPS_ACCOUNT_NUMBER || '').trim() }, body: 'grant_type=client_credentials' });
    const j = await readJson(res);
    if (!res.ok || !j?.access_token) throw new Error('UPS did not accept the client ID / secret.');
    return { token: j.access_token, expiresIn: j.expires_in };
  });
}

async function ups(env, store, mode, method, path, body) {
  const res = await fetch(`${base(mode)}${path}`, { method, headers: { Authorization: `Bearer ${await token(env, store, mode)}`, transId: randomToken(8), transactionSrc: 'stratek', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (!res.ok) {
    const e = j?.response?.errors?.[0];
    throw new Error(`UPS: ${e?.message || e?.code || `error ${res.status}`}`);
  }
  return j;
}

const addr = (a) => ({ AddressLine: [a.address.slice(0, 35)].filter(Boolean), City: a.city, ...(a.state ? { StateProvinceCode: a.state } : {}), ...(a.postalCode ? { PostalCode: a.postalCode } : {}), CountryCode: a.country });
const weightOf = (w) => ({ UnitOfMeasurement: { Code: 'KGS' }, Weight: String(w) });

export default {
  id: 'ups',
  name: 'UPS',
  category: 'delivery',
  status: 'available',
  color: '#351C15',
  description: 'International and domestic shipping with UPS: rates, labels and tracking.',
  docsUrl: 'https://developer.ups.com/',
  test: { support: 'sandbox', note: 'Test mode uses the UPS test site (CIE); test shipments are not collected or charged. The same app keys work there.' },
  secrets: [
    { name: 'UPS_CLIENT_ID', label: 'UPS client ID', hint: 'developer.ups.com -> Apps -> your app (Rating, Shipping, Tracking).' },
    { name: 'UPS_CLIENT_SECRET', label: 'UPS client secret' },
    { name: 'UPS_ACCOUNT_NUMBER', label: 'UPS account (shipper) number', hint: '6 characters, e.g. A1B2C3.' },
    ...shipperSecrets('UPS', { state: true }),
    { name: 'UPS_SERVICE_CODE', label: 'Service code', hint: 'Optional, default 65 (Worldwide Saver) abroad, 11 (Standard) at home.', optional: true },
  ],
  /** GET /pay/ups/start/:mode/:token -- the shipment's label. */
  payPage: ({ token: t, store }) => labelResponse(store, t, 'ups'),
  actions: [
    {
      id: 'quote', label: 'Get UPS rate', placement: ['transaction'],
      fields: [{ name: 'weight', label: 'Weight (kg)', type: 'number', required: true }, { name: 'country', label: 'Destination country code (e.g. US)', type: 'text', required: true }, { name: 'city', label: 'Destination city', type: 'text' }, { name: 'postalCode', label: 'Destination postal code', type: 'text' }],
      async run({ env, fields, store, mode }) {
        const s = shipperFrom(env, 'UPS');
        const dest = { address: '', city: String(fields.city || ''), postalCode: String(fields.postalCode || ''), country: cc(fields.country, 'Destination') };
        const r = await ups(env, store, mode, 'POST', '/api/rating/v2409/Shop', { RateRequest: { Request: { RequestOption: 'Shop' }, Shipment: { Shipper: { Name: s.name, ShipperNumber: String(env.UPS_ACCOUNT_NUMBER), Address: addr(s) }, ShipFrom: { Name: s.name, Address: addr(s) }, ShipTo: { Name: 'Recipient', Address: addr(dest) }, Package: { PackagingType: { Code: '02' }, PackageWeight: weightOf(kg(fields.weight, 70)) } } } });
        const rated = [].concat(r.RateResponse?.RatedShipment || []);
        const p = rated.map((x) => `${SERVICES[x.Service?.Code] || `Service ${x.Service?.Code}`}: ${x.TotalCharges?.CurrencyCode || ''} ${x.TotalCharges?.MonetaryValue ?? '?'}${x.GuaranteedDelivery?.BusinessDaysInTransit ? `, ${x.GuaranteedDelivery.BusinessDaysInTransit} days` : ''}`);
        return { type: 'message', title: 'UPS rates', text: p.length ? p.join(' · ') : 'UPS returned no services for this route.' };
      },
    },
    {
      id: 'create_shipment', outbound: true, label: 'Ship with UPS', placement: ['transaction'], fields: recipientFields({ state: true }),
      async run({ env, fields, context, store, mode, origin }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (had?.number) return bookedResult({ carrier: 'UPS', number: had.number, labelUrl: had.label ? `${origin}/pay/ups/start/${mode}/${had.label}` : null, mode, extra: '(already booked for this sale)' });
        const s = shipperFrom(env, 'UPS'); const to = recipient(fields, context);
        const intl = s.country !== to.country;
        const desc = lines(tx).map((i) => i.name).join(', ').slice(0, 35) || 'Goods';
        const r = await ups(env, store, mode, 'POST', '/api/shipments/v2409/ship', {
          ShipmentRequest: {
            Request: { RequestOption: 'nonvalidate' },
            Shipment: {
              Description: desc,
              Shipper: { Name: s.name.slice(0, 35), ShipperNumber: String(env.UPS_ACCOUNT_NUMBER), Phone: { Number: s.phone }, Address: addr(s) },
              ShipTo: { Name: to.name.slice(0, 35), AttentionName: to.name.slice(0, 35), Phone: { Number: to.phone }, ...(to.email ? { EMailAddress: to.email } : {}), Address: addr(to) },
              ShipFrom: { Name: s.name.slice(0, 35), Phone: { Number: s.phone }, Address: addr(s) },
              PaymentInformation: { ShipmentCharge: [{ Type: '01', BillShipper: { AccountNumber: String(env.UPS_ACCOUNT_NUMBER) } }] },
              Service: { Code: String(env.UPS_SERVICE_CODE || (intl ? '65' : '11')).trim() },
              ...(intl ? { InvoiceLineTotal: { CurrencyCode: tx.currency, MonetaryValue: String(Math.ceil(Number(tx.amount))) } } : {}),
              ReferenceNumber: { Value: `Sale ${tx.id}` },
              Package: [{ Description: desc, Packaging: { Code: '02' }, PackageWeight: weightOf(kg(fields.weight, 70)) }],
            },
            LabelSpecification: { LabelImageFormat: { Code: 'GIF' } },
          },
        });
        const res = r.ShipmentResponse?.ShipmentResults || {};
        const number = res.ShipmentIdentificationNumber;
        const pkg = [].concat(res.PackageResults || [])[0] || {};
        const img = pkg.ShippingLabel?.GraphicImage;
        const label = img ? await keepLabel(store, { data: img, type: 'image/gif', number }) : null;
        await rememberShipment(store, tx, { number, label, tracking: pkg.TrackingNumber || number });
        const cost = res.ShipmentCharges?.TotalCharges;
        return bookedResult({ carrier: 'UPS', number, labelUrl: label ? `${origin}/pay/ups/start/${mode}/${label}` : null, mode, extra: cost ? `Charge ${cost.CurrencyCode} ${cost.MonetaryValue}.` : '' });
      },
    },
    {
      id: 'track', label: 'Track UPS shipment', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode }) {
        const tx = sale(context);
        const s = await shipmentFor(store, tx);
        if (!s?.number) return noShipment('UPS');
        const n = s.tracking || s.number;
        const r = await ups(env, store, mode, 'GET', `/api/track/v1/details/${encodeURIComponent(n)}?locale=en_US`);
        const p = r.trackResponse?.shipment?.[0]?.package?.[0] || {};
        const act = p.activity?.[0] || {};
        return { type: 'status', title: `UPS ${n}`, status: p.currentStatus?.description || act.status?.description || 'In the system', text: [act.status?.description, act.location?.address?.city, act.date].filter(Boolean).join(' · ') };
      },
    },
  ],
};
