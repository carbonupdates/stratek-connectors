// meta_capi -- send sales to Meta (Facebook / Instagram Ads) as Purchase events
// with the Conversions API, so ads that brought customers in get the credit.
// Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
//
// Buttons
//   Test Meta Conversions API (Integrations tab)  reads the pixel/dataset name
//   Send sale to Meta Ads (sale details)          POST /{pixel}/events (event Purchase,
//                                                 action_source physical_store)
// Customer email/phone are SHA-256 hashed before they leave the connector, as Meta requires.

import { sale, sha256Hex } from './_util.js';

const graph = (env) => `https://graph.facebook.com/${String(env.META_GRAPH_VERSION || 'v23.0').trim()}`;

async function meta(env, method, path, body) {
  const url = new URL(graph(env) + path);
  url.searchParams.set('access_token', env.META_CAPI_TOKEN);
  const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Meta: ${data?.error?.error_user_msg || data?.error?.message || `error ${res.status}`}`);
  return data;
}

export default {
  id: 'meta_capi',
  name: 'Meta Conversions API',
  category: 'marketing',
  status: 'available',
  description: 'Send each sale to Meta (Facebook/Instagram Ads) as a Purchase event so ad results are measured.',
  docsUrl: 'https://developers.facebook.com/docs/marketing-api/conversions-api',
  secrets: [
    { name: 'META_PIXEL_ID', label: 'Pixel / dataset ID', hint: 'Events Manager -> your dataset -> Settings.' },
    { name: 'META_CAPI_TOKEN', label: 'Conversions API access token', hint: 'Events Manager -> Settings -> Conversions API -> Generate access token.' },
    { name: 'META_TEST_EVENT_CODE', label: 'Test event code', hint: 'Only while testing in Events Manager -> Test events. Remove it to send real events.', optional: true },
    { name: 'META_GRAPH_VERSION', label: 'Graph API version', hint: 'Leave empty for v23.0.', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test Meta Conversions API', placement: ['settings'], fields: [],
      async run({ env }) {
        const d = await meta(env, 'GET', `/${encodeURIComponent(env.META_PIXEL_ID)}?fields=name,id`);
        return { type: 'message', title: 'Meta is connected', text: `Dataset "${d.name || d.id}"${env.META_TEST_EVENT_CODE ? ' -- test mode (events show under Test events)' : ''}.` };
      },
    },
    {
      id: 'send_purchase', label: 'Send sale to Meta Ads', placement: ['transaction'],
      fields: [
        { name: 'email', label: 'Customer email (email or phone needed)', type: 'email' },
        { name: 'phone', label: 'Customer phone, with country code (e.g. 9779800000000)', type: 'tel' },
      ],
      async run({ env, context, store, fields }) {
        const tx = sale(context);
        const email = String(fields.email || '').trim().toLowerCase();
        const phone = String(fields.phone || '').replace(/\D/g, '');
        if (!email && !phone) throw new Error("Meta needs the customer's email or phone to match the sale.");
        const user_data = {};
        if (email) user_data.em = [await sha256Hex(email)];
        if (phone) user_data.ph = [await sha256Hex(phone)];
        const items = Array.isArray(tx.items) ? tx.items : [];
        const event = {
          event_name: 'Purchase',
          event_time: Math.floor(new Date(tx.createdAt || Date.now()).getTime() / 1000) || Math.floor(Date.now() / 1000),
          event_id: `stratek-${tx.id}`,
          action_source: 'physical_store',
          user_data,
          custom_data: { currency: tx.currency, value: Number(tx.amount), order_id: tx.id, contents: items.map((i) => ({ id: String(i.name).slice(0, 100), quantity: Number(i.qty) || 1, item_price: Number(i.price) || undefined })) },
        };
        const d = await meta(env, 'POST', `/${encodeURIComponent(env.META_PIXEL_ID)}/events`, { data: [event], ...(env.META_TEST_EVENT_CODE ? { test_event_code: env.META_TEST_EVENT_CODE } : {}) });
        await store.put(`tx:${tx.id}`, { sentAt: new Date().toISOString() });
        return { type: 'message', title: 'Sent to Meta', text: `Purchase of ${tx.currency} ${tx.amount} sent (${d.events_received ?? 1} event${env.META_TEST_EVENT_CODE ? ', test mode' : ''}).` };
      },
    },
  ],
};
