// whatsapp -- send receipts on WhatsApp with the WhatsApp Business Platform (Meta Cloud API).
// Messages a business starts must use a message template Meta has approved. Create one
// in WhatsApp Manager (category Utility), e.g. named "stratek_receipt", body:
//   "Thank you for shopping at {{1}}! Receipt #{{2}}: {{3}}."
// and put its name here. "Send test message" uses Meta's built-in "hello_world" template.
//   API: POST https://graph.facebook.com/v21.0/{phone-number-id}/messages
// Buttons: Test WhatsApp, Send test message (Integrations tab); Send receipt on WhatsApp (sale details;
// the phone is filled in for online-store orders).

import { sale } from './_util.js';
import { money, customerOf } from './_hooks.js';

const graph = (env) => `https://graph.facebook.com/${String(env.WHATSAPP_GRAPH_VERSION || 'v21.0').trim()}`;

async function wa(env, method, path, body) {
  const res = await fetch(`${graph(env)}${path}`, { method, headers: { Authorization: `Bearer ${String(env.WHATSAPP_TOKEN).trim()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => null);
  if (!res.ok) {
    const e = j?.error || {};
    if (e.code === 190) throw new Error('WhatsApp: the access token was refused (expired?). Use a permanent System User token.');
    if (e.code === 132001) throw new Error('WhatsApp: that template name / language does not exist or is not approved yet.');
    if (e.code === 131030) throw new Error('WhatsApp: that number is not in your allowed test list yet (add it in the Meta app, or finish setup).');
    throw new Error(`WhatsApp: ${e.error_user_msg || e.message || `error ${res.status}`}`);
  }
  return j;
}

/** International number without + : 9779812345678. Nepali 10-digit numbers get 977 in front. */
export function waNumber(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (/^9[678]\d{8}$/.test(d)) d = `977${d}`;
  if (!/^\d{8,15}$/.test(d)) throw new Error('Enter the phone number with country code, e.g. 9779812345678.');
  return d;
}

const template = (to, name, lang, params) => ({ messaging_product: 'whatsapp', to, type: 'template', template: { name, language: { code: lang }, ...(params?.length ? { components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: String(text).slice(0, 200) })) }] } : {}) } });

export default {
  id: 'whatsapp',
  name: 'WhatsApp Business',
  category: 'messaging',
  status: 'available',
  color: '#25D366',
  description: 'Send receipts to customers on WhatsApp (WhatsApp Business Platform, approved templates).',
  docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
  test: { support: 'none', note: 'Use Meta\'s test number and up to 5 allowed recipient numbers while your business is being verified.' },
  secrets: [
    { name: 'WHATSAPP_TOKEN', label: 'Access token', hint: 'Meta Business settings -> System users -> generate a permanent token with whatsapp_business_messaging.' },
    { name: 'WHATSAPP_PHONE_NUMBER_ID', label: 'Phone number ID', hint: 'Meta app -> WhatsApp -> API setup -> Phone number ID (not the phone number).' },
    { name: 'WHATSAPP_RECEIPT_TEMPLATE', label: 'Receipt template name', hint: 'An approved Utility template with 3 variables: {{1}} shop, {{2}} receipt number, {{3}} amount.' },
    { name: 'WHATSAPP_TEMPLATE_LANG', label: 'Template language code', hint: 'Optional, default en (e.g. en_US, ne).', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test WhatsApp', placement: ['settings'], fields: [],
      async run({ env }) {
        const p = await wa(env, 'GET', `/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID)}?fields=display_phone_number,verified_name,quality_rating`);
        return { type: 'message', title: 'WhatsApp is connected', text: `${p.verified_name || 'Your business'} (${p.display_phone_number || '?'}), quality ${p.quality_rating || 'unknown'}.` };
      },
    },
    {
      id: 'test_message', label: 'Send test message', placement: ['settings'],
      fields: [{ name: 'phone', label: 'Your WhatsApp number (with country code)', type: 'tel', required: true }],
      async run({ env, fields }) {
        const to = waNumber(fields.phone);
        await wa(env, 'POST', `/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID)}/messages`, template(to, 'hello_world', 'en_US', []));
        return { type: 'message', title: 'Sent', text: `Meta's "hello_world" test message was sent to +${to}.` };
      },
    },
    {
      id: 'send_receipt', label: 'Send receipt on WhatsApp', placement: ['transaction'],
      fields: [{ name: 'phone', label: 'Customer WhatsApp number', type: 'tel' }],
      async run({ env, fields, context, claims }) {
        const tx = sale(context);
        const to = waNumber(fields.phone || customerOf(context)?.phone);
        const name = String(env.WHATSAPP_RECEIPT_TEMPLATE || '').trim();
        if (!name) throw new Error('Set the receipt template name in Set up first.');
        const r = await wa(env, 'POST', `/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID)}/messages`, template(to, name, String(env.WHATSAPP_TEMPLATE_LANG || 'en').trim(), [claims?.owner_name || 'our shop', tx.id, money(tx.amount, tx.currency)]));
        return { type: 'message', title: 'Receipt sent', text: `WhatsApp message to +${to}${r.messages?.[0]?.message_status ? ` (${r.messages[0].message_status})` : ''}.` };
      },
    },
  ],
};
