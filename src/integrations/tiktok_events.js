// tiktok_events -- send sales to TikTok Ads as Purchase events (Events API), so ads that
// brought customers in get the credit -- like Meta Conversions API.
// TikTok Ads Manager -> Tools -> Events -> your pixel / event set -> Settings -> Generate
// access token. Customer email / phone are SHA-256 hashed before they leave the connector.
//   API: POST https://business-api.tiktok.com/open_api/v1.3/event/track/ (header Access-Token)
// Buttons: Test TikTok Events (Integrations tab); Send sale to TikTok Ads (sale details).

import { sale, sha256Hex } from './_util.js';
import { readJson } from './_ship.js';
import { customerOf } from './_hooks.js';

async function track(env, data, testCode) {
  const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', { method: 'POST', headers: { 'Access-Token': String(env.TIKTOK_ACCESS_TOKEN).trim(), 'Content-Type': 'application/json' }, body: JSON.stringify({ event_source: 'web', event_source_id: String(env.TIKTOK_PIXEL_CODE).trim(), ...(testCode ? { test_event_code: testCode } : {}), data }) });
  const j = await readJson(res);
  if (!res.ok || (j?.code !== undefined && j.code !== 0)) throw new Error(`TikTok: ${j?.message || `error ${res.status}`}`);
  return j;
}

export default {
  id: 'tiktok_events',
  name: 'TikTok Events API',
  category: 'marketing',
  status: 'available',
  color: '#000000',
  description: 'Send each sale to TikTok Ads as a Purchase event so ad results are measured.',
  docsUrl: 'https://business-api.tiktok.com/portal/docs?id=1771100865818625',
  test: {
    support: 'sandbox',
    note: 'Test events use the same pixel and token plus a test event code; they show under Test events only.',
    extraSecrets: [{ name: 'TIKTOK_TEST_EVENT_CODE', label: 'Test event code', hint: 'Events Manager -> your pixel -> Test events (e.g. TEST12345).' }],
  },
  secrets: [
    { name: 'TIKTOK_PIXEL_CODE', label: 'Pixel code', hint: 'TikTok Ads Manager -> Tools -> Events -> your pixel (e.g. C1ABCD...).' },
    { name: 'TIKTOK_ACCESS_TOKEN', label: 'Events API access token', hint: 'Same pixel -> Settings -> Events API -> Generate access token.' },
  ],
  actions: [
    {
      id: 'test', label: 'Test TikTok Events', placement: ['settings'], fields: [],
      async run({ env }) {
        const code = String(env.TIKTOK_TEST_EVENT_CODE || '').trim() || 'TEST00000';
        await track(env, [{ event: 'ViewContent', event_time: Math.floor(Date.now() / 1000), event_id: `stratek-test-${Date.now()}`, user: { external_id: await sha256Hex('stratek-test') }, properties: { content_name: 'Stratek test' } }], code);
        return { type: 'message', title: 'TikTok accepted it', text: `A test event was sent with code ${code} (see Events Manager -> Test events).` };
      },
    },
    {
      id: 'send_purchase', label: 'Send sale to TikTok Ads', placement: ['transaction'],
      fields: [{ name: 'email', label: 'Customer email (email or phone needed)', type: 'email' }, { name: 'phone', label: 'Customer phone, with country code', type: 'tel' }],
      async run({ env, context, store, fields, mode }) {
        const tx = sale(context);
        const c = customerOf(context, fields) || {};
        const email = String(c.email || '').trim().toLowerCase();
        const phone = String(c.phone || '').replace(/[^\d+]/g, '');
        if (!email && !phone) throw new Error("TikTok needs the customer's email or phone to match the sale.");
        const user = {};
        if (email) user.email = await sha256Hex(email);
        if (phone) user.phone = await sha256Hex(phone.startsWith('+') ? phone : `+${phone}`);
        const test = mode === 'test' ? String(env.TIKTOK_TEST_EVENT_CODE || '').trim() || 'TEST00000' : null;
        await track(env, [{ event: 'Purchase', event_time: Math.floor(new Date(tx.createdAt || Date.now()).getTime() / 1000) || Math.floor(Date.now() / 1000), event_id: `stratek-${tx.id}`, user, properties: { currency: tx.currency, value: Number(tx.amount), order_id: tx.id, content_type: 'product', contents: (tx.items || []).map((i) => ({ content_name: String(i.name).slice(0, 100), price: Number(i.price) || 0, quantity: Number(i.qty) || 1 })) } }], test);
        await store.put(`tx:${tx.id}`, { sentAt: new Date().toISOString() });
        return { type: 'message', title: 'Sent to TikTok', text: `Purchase of ${tx.currency} ${tx.amount} sent${test ? ' (test event)' : ''}.` };
      },
    },
  ],
};
