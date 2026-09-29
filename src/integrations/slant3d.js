// slant3d -- 3D print-on-demand with Slant 3D (API v2).
// Docs: https://slant3dapi.com/documentation/introduction (OpenAPI: /v2/api/openapi.json)
//
// Buttons
//   Test Slant 3D (Integrations tab)       lists your platforms and available filaments
//   Quote 3D print (sale details)          uploads the model (STL URL) and creates a DRAFT order
//                                          -> shows the price; nothing is charged yet
//   Confirm 3D print order (sale details)  processes (pays for) the draft -> goes to production
//   Track 3D print (sale details)          order status
// Slant 3D charges the payment method on your Slant 3D account when you confirm.

import { sale } from './_util.js';

const API = 'https://slant3dapi.com/v2/api';

async function sl(env, method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${env.SLANT3D_API_KEY}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Slant 3D did not accept the API key (it starts with sl-). Check it in Set up.');
    throw new Error(`Slant 3D: ${data?.message || data?.error || `error ${res.status}`}`);
  }
  return data;
}

async function platformId(env) {
  if (env.SLANT3D_PLATFORM_ID) return env.SLANT3D_PLATFORM_ID;
  const p = await sl(env, 'GET', '/platforms');
  const first = (p?.data || [])[0];
  if (!first) throw new Error('No Slant 3D platform found. Create one in your Slant 3D dashboard.');
  return first.publicId || first.id;
}

const total = (order) => {
  const t = order?.totals || order?.data?.totals || order?.pricing || {};
  const v = t.total ?? t.grandTotal ?? order?.total;
  return v !== undefined ? `${t.currency || 'USD'} ${v}` : 'see your Slant 3D dashboard';
};

export default {
  id: 'slant3d',
  name: 'Slant 3D',
  category: 'fulfilment',
  status: 'available',
  description: '3D print-on-demand: quote a print, order it and track it with Slant 3D.',
  docsUrl: 'https://slant3dapi.com/documentation/introduction',
  secrets: [
    { name: 'SLANT3D_API_KEY', label: 'Slant 3D API key', hint: 'From your Slant 3D dashboard; starts with sl-.' },
    { name: 'SLANT3D_PLATFORM_ID', label: 'Platform ID', hint: 'Leave empty to use your first platform ("Test Slant 3D" lists them).', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test Slant 3D', placement: ['settings'], fields: [],
      async run({ env }) {
        const [p, f] = await Promise.all([sl(env, 'GET', '/platforms'), sl(env, 'GET', '/filaments')]);
        const plats = (p?.data || []).map((x) => `${x.name || 'platform'} (${x.publicId || x.id})`).join(', ') || 'none yet';
        const fil = (f?.data || []).filter((x) => x.available !== false).length;
        return { type: 'message', title: 'Slant 3D is connected', text: `Platforms: ${plats}. ${fil} filaments available.` };
      },
    },
    {
      id: 'quote', label: 'Quote 3D print (Slant 3D)', placement: ['transaction'],
      fields: [
        { name: 'fileUrl', label: 'Model file URL (STL, https)', type: 'text', required: true },
        { name: 'quantity', label: 'Quantity', type: 'number', required: true, default: 1 },
        { name: 'email', label: 'Customer email', type: 'email', required: true },
        { name: 'name', label: 'Ship to (name)', type: 'text', required: true },
        { name: 'line1', label: 'Address line', type: 'text', required: true },
        { name: 'city', label: 'City', type: 'text', required: true },
        { name: 'state', label: 'State / province', type: 'text' },
        { name: 'zip', label: 'Postal code', type: 'text', required: true },
        { name: 'country', label: 'Country code (e.g. US)', type: 'text', required: true },
      ],
      async run({ env, context, store, fields }) {
        const tx = sale(context);
        if (!/^https:\/\//.test(String(fields.fileUrl))) throw new Error('The model file URL must start with https://');
        const pid = await platformId(env);
        // 1. Upload the model: presigned URL -> PUT the file -> confirm.
        const up = await sl(env, 'POST', '/files/direct-upload', { name: String(fields.fileUrl).split('/').pop().split('?')[0] || 'model.stl', platformId: pid, ownerId: `stratek-${tx.id}` });
        const file = await fetch(fields.fileUrl);
        if (!file.ok) throw new Error(`Could not download the model file (${file.status}).`);
        const put = await fetch(up.presignedUrl, { method: 'PUT', body: await file.arrayBuffer() });
        if (!put.ok) throw new Error(`Uploading the model to Slant 3D failed (${put.status}).`);
        const conf = await sl(env, 'POST', '/files/confirm-upload', { filePlaceholder: up.filePlaceholder });
        const f = conf?.data || conf;
        const fileId = f.publicFileServiceId || f.publicId || f.id;
        // 2. Draft order (priced, not charged).
        const d = await sl(env, 'POST', '/orders', {
          platformId: pid,
          ownerId: `stratek-${tx.id}`,
          customer: { details: { email: fields.email, address: { name: fields.name, line1: fields.line1, city: fields.city, state: fields.state || undefined, zip: fields.zip, country: String(fields.country).toUpperCase() } } },
          items: [{ type: 'PRINT', quantity: Math.max(1, Math.round(Number(fields.quantity) || 1)), publicFileServiceId: fileId }],
        });
        const order = d?.order || d;
        const orderId = order.publicId || order.publicOrderId || order.id;
        await store.put(`tx:${tx.id}`, { orderId, fileId });
        return { type: 'status', title: 'Slant 3D quote (draft)', status: 'Draft', text: `Order ${orderId}: ${total(order)}. Nothing is charged yet -- press "Confirm 3D print order" to pay and send it to production.` };
      },
    },
    {
      id: 'confirm', label: 'Confirm 3D print order', placement: ['transaction'], fields: [],
      async run({ env, context, store }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved?.orderId) throw new Error('Make a quote first ("Quote 3D print").');
        const d = await sl(env, 'POST', `/orders/${encodeURIComponent(saved.orderId)}`);
        const order = d?.order || d;
        return { type: 'status', title: 'Slant 3D order', status: order.status || 'PROCESSING', text: `Order ${saved.orderId} sent to production. Charged to your Slant 3D account: ${total(order)}.` };
      },
    },
    {
      id: 'track', label: 'Track 3D print', placement: ['transaction'], fields: [],
      async run({ env, context, store }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved?.orderId) return { type: 'message', title: 'No 3D print', text: 'No Slant 3D order for this sale.' };
        const d = await sl(env, 'GET', `/orders/${encodeURIComponent(saved.orderId)}`);
        const order = d?.order || d;
        const track = order.trackingNumber || order.tracking?.number;
        return { type: 'status', title: `Slant 3D ${saved.orderId}`, status: order.status || 'Unknown', text: track ? `Tracking: ${track}.` : '' };
      },
    },
  ],
};
