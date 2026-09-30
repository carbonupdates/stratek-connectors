// sparrow_sms -- SMS receipts in Nepal with Sparrow SMS (docs.sparrowsms.com).
//   POST https://api.sparrowsms.com/v2/sms/   token, from, to (10-digit), text
//   GET  https://api.sparrowsms.com/v2/credit/?token=...
// Buttons: Test Sparrow SMS (shows credits) and Send test SMS (Integrations tab);
// Send receipt by SMS (sale details; the customer's phone is filled in for online orders).
// Note: if IP whitelisting is on in Sparrow, switch it off -- Cloudflare's addresses change.

import { sale } from './_util.js';
import { money, customerOf } from './_hooks.js';

const base = (env) => String(env.SPARROW_SMS_BASE_URL || 'https://api.sparrowsms.com/v2').replace(/\/+$/, '');
const ERRORS = { 1001: 'Sparrow refused this server\'s IP address -- switch off IP whitelisting in your Sparrow account.', 1002: 'Sparrow did not accept the token. Copy it again into Set up.', 1003: 'Your Sparrow account is inactive.', 1004: 'Your Sparrow account is inactive.', 1005: 'Your Sparrow account has expired.', 1006: 'Your Sparrow account has expired.', 1007: 'That phone number was not accepted.', 1008: 'Sparrow did not accept the sender identity (From). Use the identity approved in your account.', 1011: 'No valid phone number.', 1012: 'Your Sparrow account has no SMS credits left.', 1013: 'Your Sparrow account has no SMS credits left.' };

async function sparrow(env, path, params, method = 'GET') {
  const url = new URL(`${base(env)}${path}`);
  const body = new URLSearchParams({ token: env.SPARROW_SMS_TOKEN, ...params });
  if (method === 'GET') url.search = body.toString();
  const res = await fetch(url, method === 'GET' ? {} : { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await res.json().catch(() => null);
  if (!res.ok || (j && j.response_code && j.response_code !== 200)) throw new Error(`Sparrow SMS: ${ERRORS[j?.response_code] || j?.response || `error ${res.status}`}`);
  return j || {};
}

/** 98XXXXXXXX (also accepts +977 / 977 in front, spaces, dashes). */
export function nepalMobile(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('977') && d.length === 13) d = d.slice(3);
  if (!/^9[678]\d{8}$/.test(d)) throw new Error('Enter a Nepali mobile number (10 digits, e.g. 98XXXXXXXX).');
  return d;
}

const send = (env, to, text) => sparrow(env, '/sms/', { from: env.SPARROW_SMS_FROM, to, text }, 'POST');

export default {
  id: 'sparrow_sms',
  name: 'Sparrow SMS',
  category: 'messaging',
  status: 'available',
  description: 'SMS receipts to customers in Nepal.',
  docsUrl: 'https://docs.sparrowsms.com/sms/documentation/',
  test: { support: 'none', note: 'Sparrow has no test environment -- every SMS uses real credits.' },
  secrets: [
    { name: 'SPARROW_SMS_TOKEN', label: 'Sparrow SMS token', hint: 'Sparrow SMS dashboard -> API / Developer -> token. Switch off IP whitelisting (Cloudflare\'s addresses change).' },
    { name: 'SPARROW_SMS_FROM', label: 'Sender identity (From)', hint: 'The identity Sparrow approved for your account (e.g. your shop name, or "InfoSMS" on a new account).' },
  ],
  actions: [
    {
      id: 'test', label: 'Test Sparrow SMS', placement: ['settings'], fields: [],
      async run({ env }) {
        const c = await sparrow(env, '/credit/', {});
        return { type: 'message', title: 'Sparrow SMS is connected', text: `Credits available: ${c.credits_available ?? '?'} (used: ${c.credits_consumed ?? '?'}).` };
      },
    },
    {
      id: 'test_sms', label: 'Send test SMS', placement: ['settings'],
      fields: [{ name: 'phone', label: 'Your mobile number', type: 'tel', required: true }],
      async run({ env, fields, claims }) {
        const to = nepalMobile(fields.phone);
        await send(env, to, `${claims?.owner_name || 'Stratek'}: test SMS from Stratek. Receipts will look like this.`);
        return { type: 'message', title: 'Sent', text: `Test SMS sent to ${to}.` };
      },
    },
    {
      id: 'send_receipt', label: 'Send receipt by SMS', placement: ['transaction'],
      fields: [{ name: 'phone', label: 'Customer mobile number', type: 'tel' }],
      async run({ env, fields, context, claims, mode }) {
        const tx = sale(context);
        const to = nepalMobile(fields.phone || customerOf(context)?.phone);
        const shop = String(claims?.owner_name || 'Your shop').slice(0, 30);
        const text = `${mode === 'test' ? 'TEST ' : ''}${shop}: thank you! Receipt #${tx.id}, ${money(tx.amount, tx.currency)}${tx.createdAt ? `, ${String(tx.createdAt).slice(0, 10)}` : ''}.`;
        await send(env, to, text);
        return { type: 'message', title: 'Receipt sent', text: `SMS sent to ${to}.` };
      },
    },
  ],
};
