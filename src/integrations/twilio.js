// twilio -- SMS (and WhatsApp) receipts and owner alerts worldwide through Twilio.
// console.twilio.com -> Account SID + Auth Token; buy a number (or a Messaging Service /
// alphanumeric sender where allowed). WhatsApp: use a Twilio WhatsApp sender ("whatsapp:+1...").
// Test keys: Twilio test credentials (magic From number +15005550006) -- nothing is sent.
//   API: https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json (basic SID:token)
// Buttons: Test Twilio, Send test SMS (Integrations tab); Send receipt by SMS (sale details --
// the phone is filled in for online-store orders).

import { sale } from './_util.js';
import { readJson } from './_ship.js';
import { customerOf } from './_hooks.js';
import { receiptText } from './_receipt.js';

const sid = (env) => { const s = String(env.TWILIO_ACCOUNT_SID || '').trim(); if (!/^AC[0-9a-f]{32}$/i.test(s)) throw new Error('Twilio: the Account SID starts with AC and has 34 characters.'); return s; };

async function tw(env, method, path, form) {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid(env)}${path}`, { method, headers: { Authorization: `Basic ${btoa(`${sid(env)}:${String(env.TWILIO_AUTH_TOKEN).trim()}`)}`, ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) }, body: form ? new URLSearchParams(form) : undefined });
  const j = await readJson(res);
  if (res.status === 401) throw new Error('Twilio did not accept the Account SID / Auth Token.');
  if (!res.ok) throw new Error(`Twilio: ${j?.message || `error ${res.status}`}${j?.code ? ` (code ${j.code})` : ''}`);
  return j || {};
}

/** E.164: +9779812345678. Nepali 10-digit mobiles get +977. */
export function e164(raw) {
  let d = String(raw || '').trim().replace(/[\s()-]/g, '');
  if (/^9[678]\d{8}$/.test(d)) d = `+977${d}`;
  if (/^00\d+$/.test(d)) d = `+${d.slice(2)}`;
  if (/^\d{8,15}$/.test(d)) d = `+${d}`;
  if (!/^\+\d{8,15}$/.test(d)) throw new Error('Enter the phone number with country code, e.g. +9779812345678.');
  return d;
}

function sender(env, whatsapp) {
  if (whatsapp) { const w = String(env.TWILIO_WHATSAPP_FROM || '').trim(); if (!w) throw new Error('Set the WhatsApp sender in Set up first.'); return { From: w.startsWith('whatsapp:') ? w : `whatsapp:${w}` }; }
  const ms = String(env.TWILIO_MESSAGING_SERVICE_SID || '').trim();
  if (ms) return { MessagingServiceSid: ms };
  const f = String(env.TWILIO_FROM || '').trim();
  if (!f) throw new Error('Set the From number (or a Messaging Service SID) in Set up.');
  return { From: f };
}
const send = (env, to, body, whatsapp = false) => tw(env, 'POST', '/Messages.json', { To: whatsapp ? `whatsapp:${e164(to)}` : e164(to), Body: body, ...sender(env, whatsapp) });

export default {
  id: 'twilio',
  name: 'Twilio',
  category: 'messaging',
  status: 'available',
  color: '#F22F46',
  description: 'SMS and WhatsApp receipts and alerts worldwide (Twilio).',
  docsUrl: 'https://www.twilio.com/docs/messaging/api/message-resource',
  test: { support: 'sandbox', note: 'Use Twilio test credentials (Console -> Account -> API keys & tokens -> Test credentials) with From +15005550006; nothing is really sent.' },
  secrets: [
    { name: 'TWILIO_ACCOUNT_SID', label: 'Account SID', hint: 'console.twilio.com -> Account info (starts with AC).' },
    { name: 'TWILIO_AUTH_TOKEN', label: 'Auth Token' },
    { name: 'TWILIO_FROM', label: 'From number or sender ID', hint: 'Your Twilio number (+1...) or an alphanumeric sender ID where allowed.', optional: true },
    { name: 'TWILIO_MESSAGING_SERVICE_SID', label: 'Messaging Service SID', hint: 'Optional, instead of a From number (MG...).', optional: true },
    { name: 'TWILIO_WHATSAPP_FROM', label: 'WhatsApp sender', hint: 'Optional: your Twilio WhatsApp number, e.g. whatsapp:+14155238886.', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test Twilio', placement: ['settings'], fields: [],
      async run({ env }) {
        const a = await tw(env, 'GET', '.json');
        return { type: 'message', title: 'Twilio is connected', text: `${a.friendly_name || 'Account'} (${a.status || 'active'}${a.type === 'Trial' ? ', trial: only verified numbers get messages' : ''}).` };
      },
    },
    {
      id: 'test_sms', label: 'Send test SMS', placement: ['settings'], fields: [{ name: 'phone', label: 'Your phone (with country code)', type: 'tel', required: true }],
      async run({ env, fields, claims }) {
        const m = await send(env, fields.phone, `Hello from ${claims?.owner_name || 'Stratek'} -- Twilio is connected.`);
        return { type: 'message', title: 'Sent', text: `Test SMS to ${m.to || e164(fields.phone)} (${m.status || 'queued'}).` };
      },
    },
    {
      id: 'send_receipt', label: 'Send receipt by SMS', placement: ['transaction'],
      fields: [{ name: 'phone', label: 'Customer phone (with country code)', type: 'tel' }, { name: 'whatsapp', label: 'Send on WhatsApp instead (yes / no)', type: 'text' }],
      async run({ env, fields, context, claims, mode }) {
        const tx = sale(context);
        const phone = fields.phone || customerOf(context)?.phone;
        if (!phone) throw new Error('Enter the customer\'s phone number.');
        const wa = /^y/i.test(String(fields.whatsapp || ''));
        const m = await send(env, phone, receiptText(tx, claims?.owner_name, { test: mode === 'test', max: wa ? 1500 : 480 }), wa);
        return { type: 'message', title: 'Receipt sent', text: `${wa ? 'WhatsApp' : 'SMS'} to ${m.to || e164(phone)} (${m.status || 'queued'}).` };
      },
    },
  ],
};
