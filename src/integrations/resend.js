// resend -- email receipts to customers from your own domain through Resend.
// resend.com -> Domains -> add and verify your domain (DNS records you add yourself) ->
// API Keys -> create a key (sending access). Put the From address on that domain.
//   API: https://api.resend.com (Bearer) -- POST /emails, GET /domains
// Buttons: Test Resend, Send test email (Integrations tab); Email receipt (sale details --
// the email is filled in for online-store orders).

import { sale } from './_util.js';
import { readJson } from './_ship.js';
import { customerOf } from './_hooks.js';
import { receiptText, receiptHtml } from './_receipt.js';

async function rs(env, method, path, body, idem) {
  const res = await fetch(`https://api.resend.com${path}`, { method, headers: { Authorization: `Bearer ${String(env.RESEND_API_KEY).trim()}`, 'Content-Type': 'application/json', ...(idem ? { 'Idempotency-Key': idem } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 401 || res.status === 403) throw new Error(`Resend: ${j?.message || 'the API key was refused (it needs sending access)'}.`);
  if (!res.ok) throw new Error(`Resend: ${j?.message || `error ${res.status}`}`);
  return j || {};
}
const emailOk = (e) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(e);
const from = (env) => { const f = String(env.RESEND_FROM || '').trim(); if (!f) throw new Error('Set the From address in Set up (e.g. Chyau <receipts@chyau.com>).'); return f; };

export default {
  id: 'resend',
  name: 'Resend',
  category: 'messaging',
  status: 'available',
  color: '#111111',
  description: 'Email receipts to customers from your own domain (Resend).',
  docsUrl: 'https://resend.com/docs/api-reference/emails/send-email',
  test: { support: 'none', note: 'Resend has no test mode; receipts for Test-mode sales are marked TEST.' },
  secrets: [
    { name: 'RESEND_API_KEY', label: 'Resend API key', hint: 'resend.com -> API Keys -> Create (sending access). Verify your domain first under Domains.' },
    { name: 'RESEND_FROM', label: 'From address', hint: 'On your verified domain, e.g. Chyau Bio <receipts@chyau.com>.' },
    { name: 'RESEND_REPLY_TO', label: 'Reply-to address', hint: 'Optional: where customer replies go.', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test Resend', placement: ['settings'], fields: [],
      async run({ env }) {
        const d = await rs(env, 'GET', '/domains');
        const list = (d.data || []).map((x) => `${x.name} (${x.status})`);
        return { type: 'message', title: 'Resend is connected', text: list.length ? `Domains: ${list.join(', ')}.` : 'Connected -- add and verify a domain in Resend to send receipts.' };
      },
    },
    {
      id: 'test_email', label: 'Send test email', placement: ['settings'], fields: [{ name: 'email', label: 'Send to (your email)', type: 'email', required: true }],
      async run({ env, fields, claims }) {
        const to = String(fields.email || '').trim();
        if (!emailOk(to)) throw new Error('Enter a valid email address.');
        const tx = { id: 'TEST', amount: 100, currency: 'NPR', items: [{ name: 'Sample item', price: 100, qty: 1 }] };
        await rs(env, 'POST', '/emails', { from: from(env), to: [to], subject: `Test receipt from ${claims?.owner_name || 'Stratek'}`, html: receiptHtml(tx, claims?.owner_name, { test: true }), text: receiptText(tx, claims?.owner_name, { test: true, max: 5000 }) });
        return { type: 'message', title: 'Sent', text: `A sample receipt was emailed to ${to}.` };
      },
    },
    {
      id: 'send_receipt', label: 'Email receipt', placement: ['transaction'], fields: [{ name: 'email', label: 'Customer email', type: 'email' }],
      async run({ env, fields, context, claims, mode }) {
        const tx = sale(context);
        const to = String(fields.email || customerOf(context)?.email || '').trim();
        if (!emailOk(to)) throw new Error('Enter the customer\'s email.');
        const r = await rs(env, 'POST', '/emails', { from: from(env), to: [to], ...(env.RESEND_REPLY_TO ? { reply_to: String(env.RESEND_REPLY_TO).trim() } : {}), subject: `${mode === 'test' ? '[TEST] ' : ''}Your receipt from ${claims?.owner_name || 'us'} (#${tx.id})`, html: receiptHtml(tx, claims?.owner_name, { test: mode === 'test' }), text: receiptText(tx, claims?.owner_name, { test: mode === 'test', max: 5000 }) }, `receipt-${tx.id}`);
        return { type: 'message', title: 'Receipt emailed', text: `Sent to ${to}${r.id ? ` (${r.id})` : ''}.` };
      },
    },
  ],
};
