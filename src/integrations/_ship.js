// Shared by the shipping / fulfilment integrations (wave 4): the recipient form,
// input checks, labels kept in the connector, SKU lists and per-sale shipment memory.

import { randomToken } from './_nepal.js';
import { customerOf } from './_hooks.js';

export const cc = (v, what = 'Country') => {
  const c = String(v || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) throw new Error(`${what}: use the 2-letter country code (e.g. NP, US, GB, IN).`);
  return c;
};

export const kg = (v, max = 300) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > max) throw new Error(`Weight must be between 0 and ${max} kg.`);
  return Math.round(n * 1000) / 1000;
};

/** Tomorrow in Nepal time, YYYY-MM-DD (carriers refuse ship dates in the past). */
export const shipDate = () => new Date(Date.now() + 345 * 60000 + 24 * 3600 * 1000).toISOString().slice(0, 10);

/** The delivery address form used by every "Ship with ..." button. */
export const recipientFields = ({ state = false, weight = true } = {}) => [
  { name: 'recipientName', label: 'Recipient name', type: 'text' },
  { name: 'recipientPhone', label: 'Recipient phone (with country code)', type: 'tel' },
  { name: 'recipientEmail', label: 'Recipient email', type: 'email' },
  { name: 'recipientAddress', label: 'Street address', type: 'text', required: true },
  { name: 'recipientCity', label: 'City', type: 'text', required: true },
  ...(state ? [{ name: 'recipientState', label: 'State / province code (US, CA, IN, AU...)', type: 'text' }] : []),
  { name: 'recipientPostalCode', label: 'Postal code', type: 'text' },
  { name: 'country', label: 'Country code (e.g. US)', type: 'text', required: true },
  ...(weight ? [{ name: 'weight', label: 'Weight (kg)', type: 'number', required: true }] : []),
];

/** The recipient from the form, falling back to the online-order customer. */
export function recipient(fields, context) {
  const c = customerOf(context) || {};
  const r = {
    name: String(fields.recipientName || c.name || '').trim().slice(0, 100),
    phone: String(fields.recipientPhone || c.phone || '').trim().slice(0, 20),
    email: String(fields.recipientEmail || c.email || '').trim().slice(0, 120),
    address: String(fields.recipientAddress || '').trim(),
    city: String(fields.recipientCity || '').trim(),
    state: String(fields.recipientState || '').trim().toUpperCase(),
    postalCode: String(fields.recipientPostalCode || '').trim(),
    country: cc(fields.country, 'Destination'),
  };
  if (!r.name) throw new Error('Enter the recipient name.');
  if (!r.phone) throw new Error('Enter the recipient phone.');
  if (!r.address || !r.city) throw new Error('Enter the street address and city.');
  return r;
}

/** Sale items, or one line for the whole sale when it has none. */
export const lines = (tx) => ((tx.items || []).length ? tx.items : [{ name: `Goods (sale #${tx.id})`, price: Number(tx.amount), qty: 1 }]);

/**
 * SKUs for warehouse services (Amazon, ShipBob, ShipStation). Typed "MUG-01 x2, TEE-M" wins;
 * otherwise each sale item's own sku, else stratek-<id>. -> [{ sku, qty, name, price }]
 */
export function skuLines(text, tx) {
  const t = String(text || '').trim();
  if (t) {
    return t.split(/[,\n]+/).map((p) => p.trim()).filter(Boolean).map((p) => {
      const m = p.match(/^(.+?)(?:\s*[x×*]\s*(\d+))?$/i);
      const qty = Number(m?.[2] || 1);
      if (!m || !(qty > 0 && qty <= 999)) throw new Error(`Could not read "${p}". Use e.g. MUG-01 x2, TEE-M x1.`);
      return { sku: m[1].trim().slice(0, 50), qty, name: m[1].trim(), price: 0 };
    });
  }
  const items = tx.items || [];
  if (!items.length) throw new Error('This sale has no items. Type the SKUs to send, e.g. MUG-01 x2.');
  return items.map((i) => ({ sku: String(i.sku || (i.id != null ? `stratek-${i.id}` : '')).slice(0, 50), qty: Number(i.qty || 1), name: String(i.name || ''), price: Number(i.price || 0) }))
    .map((l) => { if (!l.sku) throw new Error(`"${l.name}" has no SKU. Type the SKUs to send, e.g. MUG-01 x2.`); return l; });
}
export const skuField = { name: 'skus', label: 'SKUs and quantities (optional, e.g. MUG-01 x2, TEE-M x1)', type: 'text' };

/** Keep a label (base64) in the connector; -> token for /pay/<id>/start/<mode>/<token>. */
export async function keepLabel(store, { data, type = 'application/pdf', number }) {
  const token = randomToken(16);
  await store.put(`label:${token}`, { data, type, number });
  return token;
}

/** payPage hook body: serve a kept label. */
export async function labelResponse(store, token, prefix) {
  const f = await store.get(`label:${token}`);
  if (!f) return new Response('Label not found.', { status: 404 });
  const type = f.type || 'application/pdf';
  const ext = type.includes('pdf') ? 'pdf' : type.split('/')[1] || 'bin';
  const bin = Uint8Array.from(atob(f.data || f.pdf), (c) => c.charCodeAt(0));
  return new Response(bin, { headers: { 'Content-Type': type, 'Content-Disposition': `inline; filename="${prefix}-${f.number || 'label'}.${ext}"`, 'Cache-Control': 'no-store' } });
}

/** The shipment already booked for this sale (one per sale -- a second press shows it again). */
export const shipmentFor = (store, tx) => store.get(`tx:${tx.id}`);
export const rememberShipment = (store, tx, data) => store.put(`tx:${tx.id}`, { ...data, at: new Date().toISOString() });

/** A result for a booked shipment: link to the label when there is one. */
export function bookedResult({ carrier, number, labelUrl, mode, extra = '' }) {
  const t = mode === 'test' ? ' (TEST)' : '';
  return labelUrl
    ? { type: 'link', title: `${carrier} ${number}`, text: `Shipment booked${t}. Print the label and hand the parcel over.${extra ? ` ${extra}` : ''}`, url: labelUrl, linkLabel: 'Open label' }
    : { type: 'status', title: carrier, status: 'Booked', text: `${number}${t}.${extra ? ` ${extra}` : ''}` };
}

export const noShipment = (carrier) => ({ type: 'message', title: `No ${carrier} shipment`, text: `This sale was not shipped with ${carrier} from Stratek.` });

/** Standard error for a bad HTTP response. */
export async function readJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return { _text: text.slice(0, 200) }; }
}

/** Your pickup address, set once per carrier: <P>_SHIPPER_NAME / _PHONE / _ADDRESS / _CITY / _STATE / _POSTAL_CODE / _COUNTRY. */
export const shipperSecrets = (P, { state = false } = {}) => [
  { name: `${P}_SHIPPER_NAME`, label: 'Shipper (your business) name' },
  { name: `${P}_SHIPPER_PHONE`, label: 'Shipper phone' },
  { name: `${P}_SHIPPER_ADDRESS`, label: 'Shipper street address' },
  { name: `${P}_SHIPPER_CITY`, label: 'Shipper city', hint: 'e.g. Lalitpur' },
  ...(state ? [{ name: `${P}_SHIPPER_STATE`, label: 'Shipper state / province code', hint: 'Only for US, CA, IN, AU... Leave empty in Nepal.', optional: true }] : []),
  { name: `${P}_SHIPPER_POSTAL_CODE`, label: 'Shipper postal code', hint: 'e.g. 44700', optional: true },
  { name: `${P}_SHIPPER_COUNTRY`, label: 'Shipper country code', hint: 'Optional, default NP.', optional: true },
];
export const shipperFrom = (env, P) => ({
  name: String(env[`${P}_SHIPPER_NAME`] || 'Shop').trim().slice(0, 100),
  phone: String(env[`${P}_SHIPPER_PHONE`] || '').trim(),
  address: String(env[`${P}_SHIPPER_ADDRESS`] || '').trim(),
  city: String(env[`${P}_SHIPPER_CITY`] || '').trim(),
  state: String(env[`${P}_SHIPPER_STATE`] || '').trim().toUpperCase(),
  postalCode: String(env[`${P}_SHIPPER_POSTAL_CODE`] || '').trim(),
  country: cc(env[`${P}_SHIPPER_COUNTRY`] || 'NP', 'Shipper country'),
});

/** Access tokens (client credentials) cached in the integration memory until 60 s before expiry. */
export async function cachedToken(store, key, fetchToken) {
  const t = await store.get(key);
  if (t?.token && t.exp > Date.now() + 60000) return t.token;
  const { token, expiresIn } = await fetchToken();
  await store.put(key, { token, exp: Date.now() + Number(expiresIn || 3600) * 1000 });
  return token;
}
