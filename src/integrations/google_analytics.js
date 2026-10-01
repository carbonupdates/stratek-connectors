// google_analytics -- send in-store and online Stratek sales to Google Analytics 4 as
// "purchase" events (Measurement Protocol), so revenue shows next to your website traffic.
// GA4 -> Admin -> Data streams -> your stream -> Measurement Protocol API secrets -> Create.
//   API: POST https://www.google-analytics.com/mp/collect?measurement_id=&api_secret=
//        (test: /debug/mp/collect -- checks the event, records nothing)
// Buttons: Test Google Analytics (Integrations tab); Send sale to Google Analytics (sale details).

import { sale } from './_util.js';
import { readJson } from './_ship.js';

const url = (env, debug) => `https://www.google-analytics.com/${debug ? 'debug/' : ''}mp/collect?${new URLSearchParams({ measurement_id: String(env.GA4_MEASUREMENT_ID).trim(), api_secret: String(env.GA4_API_SECRET).trim() })}`;
const mid = (env) => { const m = String(env.GA4_MEASUREMENT_ID || '').trim(); if (!/^G-[A-Z0-9]{4,}$/i.test(m)) throw new Error('Google Analytics: the measurement ID looks like G-XXXXXXX.'); return m; };

async function collect(env, body, debug) {
  mid(env);
  const res = await fetch(url(env, debug), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!debug) { if (!res.ok && res.status !== 204) throw new Error(`Google Analytics answered ${res.status}.`); return null; }
  const j = await readJson(res);
  const msgs = j?.validationMessages || [];
  if (msgs.length) throw new Error(`Google Analytics: ${msgs.map((m) => m.description).join('; ').slice(0, 300)}`);
  return j;
}

export function purchaseEvent(tx) {
  const items = (tx.items || []).map((i, n) => ({ item_id: String(i.sku || i.id || n + 1), item_name: String(i.name).slice(0, 100), price: Number(i.price) || 0, quantity: Number(i.qty) || 1 }));
  return { name: 'purchase', params: { transaction_id: `stratek-${tx.id}`, value: Number(tx.amount), currency: tx.currency, ...(items.length ? { items } : {}), affiliation: 'Stratek', engagement_time_msec: 1 } };
}

export default {
  id: 'google_analytics',
  name: 'Google Analytics 4',
  category: 'marketing',
  status: 'available',
  color: '#E37400',
  description: 'Send Stratek sales to Google Analytics 4 as purchases (Measurement Protocol).',
  docsUrl: 'https://developers.google.com/analytics/devguides/collection/protocol/ga4',
  test: { support: 'sandbox', note: 'In Test mode sales go to Google\'s validation endpoint only -- checked, never recorded.' },
  secrets: [
    { name: 'GA4_MEASUREMENT_ID', label: 'Measurement ID', hint: 'GA4 -> Admin -> Data streams -> your stream (G-XXXXXXX).' },
    { name: 'GA4_API_SECRET', label: 'Measurement Protocol API secret', hint: 'Same stream -> Measurement Protocol API secrets -> Create.' },
  ],
  actions: [
    {
      id: 'test', label: 'Test Google Analytics', placement: ['settings'], fields: [],
      async run({ env }) {
        await collect(env, { client_id: 'stratek.test', events: [{ name: 'stratek_test', params: { engagement_time_msec: 1 } }] }, true);
        return { type: 'message', title: 'Google Analytics is ready', text: `Measurement ID ${mid(env)} accepted (checked with Google's validation server).` };
      },
    },
    {
      id: 'send_purchase', label: 'Send sale to Google Analytics', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode }) {
        const tx = sale(context);
        const had = await store.get(`tx:${tx.id}`);
        if (had && mode !== 'test') return { type: 'message', title: 'Already sent', text: `Sale #${tx.id} was sent to Google Analytics on ${String(had.sentAt).slice(0, 10)}.` };
        await collect(env, { client_id: `stratek.${tx.id}`, events: [purchaseEvent(tx)] }, mode === 'test');
        if (mode !== 'test') await store.put(`tx:${tx.id}`, { sentAt: new Date().toISOString() });
        return { type: 'message', title: mode === 'test' ? 'Checked (test mode)' : 'Sent to Google Analytics', text: `Purchase of ${tx.currency} ${tx.amount}${mode === 'test' ? ' passed Google\'s validation (not recorded).' : ' sent. It appears in GA4 reports within a day.'}` };
      },
    },
  ],
};
