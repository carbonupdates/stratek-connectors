// hubspot -- add (or update) a customer as a HubSpot contact.
//   API: https://api.hubapi.com/crm/v3/objects/contacts (private app token,
//   scopes crm.objects.contacts.read + crm.objects.contacts.write)
// Buttons: Test HubSpot (Integrations tab); Add customer to HubSpot (sale details;
// email/name/phone filled in for online-store orders).

import { customerOf, money } from './_hooks.js';
import { sale } from './_util.js';

async function hs(env, method, path, body) {
  const res = await fetch(`https://api.hubapi.com${path}`, { method, headers: { Authorization: `Bearer ${String(env.HUBSPOT_TOKEN).trim()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => null);
  if (res.status === 401) throw new Error('HubSpot did not accept the token. Copy the private app access token again.');
  if (res.status === 403) throw new Error('HubSpot: the private app needs the scopes crm.objects.contacts.read and crm.objects.contacts.write.');
  return { ok: res.ok, status: res.status, j };
}

export default {
  id: 'hubspot',
  name: 'HubSpot',
  category: 'marketing',
  status: 'available',
  description: 'Add customers to HubSpot as contacts.',
  docsUrl: 'https://developers.hubspot.com/docs/api/crm/contacts',
  test: { support: 'none', note: 'Use a HubSpot test account if you want to try it without touching real contacts.' },
  secrets: [
    { name: 'HUBSPOT_TOKEN', label: 'Private app access token', hint: 'HubSpot -> Settings -> Integrations -> Private apps -> Create -> scopes crm.objects.contacts.read and .write -> copy the access token.' },
  ],
  actions: [
    {
      id: 'test', label: 'Test HubSpot', placement: ['settings'], fields: [],
      async run({ env }) {
        const r = await hs(env, 'GET', '/crm/v3/objects/contacts?limit=1');
        if (!r.ok) throw new Error(`HubSpot: ${r.j?.message || `error ${r.status}`}`);
        return { type: 'message', title: 'HubSpot is connected', text: 'Contacts can be added from a sale.' };
      },
    },
    {
      id: 'add_customer', label: 'Add customer to HubSpot', placement: ['transaction'],
      fields: [{ name: 'email', label: 'Customer email', type: 'email' }, { name: 'name', label: 'Customer name', type: 'text' }, { name: 'phone', label: 'Customer phone', type: 'tel' }],
      async run({ env, fields, context }) {
        const tx = sale(context);
        const c = customerOf(context, fields) || {};
        const email = String(c.email || '').trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter the customer\'s email.');
        const [first, ...rest] = String(c.name || '').trim().split(/\s+/);
        const properties = { email, ...(first ? { firstname: first } : {}), ...(rest.length ? { lastname: rest.join(' ') } : {}), ...(c.phone ? { phone: String(c.phone) } : {}) };
        let r = await hs(env, 'POST', '/crm/v3/objects/contacts', { properties });
        if (r.status === 409) {
          r = await hs(env, 'PATCH', `/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`, { properties });
          if (!r.ok) throw new Error(`HubSpot: ${r.j?.message || `error ${r.status}`}`);
          return { type: 'message', title: 'Updated in HubSpot', text: `${email} was already a contact; details updated (sale #${tx.id}, ${money(tx.amount, tx.currency)}).` };
        }
        if (!r.ok) throw new Error(`HubSpot: ${r.j?.message || `error ${r.status}`}`);
        return { type: 'message', title: 'Added to HubSpot', text: `${email} is now a contact.` };
      },
    },
  ],
};
