// mailchimp -- add a customer to your Mailchimp audience.
// New contacts get a confirmation email first (status "pending", double opt-in), unless
// you set MAILCHIMP_STATUS to "subscribed" -- only do that if customers agreed to marketing.
//   API: https://<dc>.api.mailchimp.com/3.0 (dc = the part after the dash in the key)
// Buttons: Test Mailchimp (Integrations tab); Add customer to Mailchimp (sale details;
// email/name filled in for online-store orders).

import { customerOf } from './_hooks.js';

function dc(env) {
  const m = String(env.MAILCHIMP_API_KEY || '').trim().match(/-([a-z]+\d+)$/);
  if (!m) throw new Error('Mailchimp: the API key should end with your data centre, e.g. ...-us21. Copy it again from Mailchimp.');
  return m[1];
}

async function mc(env, method, path, body) {
  const res = await fetch(`https://${dc(env)}.api.mailchimp.com/3.0${path}`, { method, headers: { Authorization: `Basic ${btoa(`stratek:${String(env.MAILCHIMP_API_KEY).trim()}`)}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, j };
}
const fail = (r) => { throw new Error(`Mailchimp: ${r.j?.detail || r.j?.title || `error ${r.status}`}`); };

export default {
  id: 'mailchimp',
  name: 'Mailchimp',
  category: 'marketing',
  status: 'available',
  description: 'Add customers to your Mailchimp audience (they confirm by email first).',
  docsUrl: 'https://mailchimp.com/developer/marketing/api/list-members/',
  test: { support: 'none', note: 'Mailchimp has no test environment.' },
  secrets: [
    { name: 'MAILCHIMP_API_KEY', label: 'Mailchimp API key', hint: 'Mailchimp -> Profile -> Extras -> API keys -> Create a key (ends with e.g. -us21).' },
    { name: 'MAILCHIMP_AUDIENCE_ID', label: 'Audience ID', hint: 'Audience -> Settings -> Audience name and defaults -> Audience ID.' },
    { name: 'MAILCHIMP_STATUS', label: 'New contacts are', hint: 'Optional: "pending" (default -- they get a confirmation email) or "subscribed" (only if they already agreed to marketing).', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test Mailchimp', placement: ['settings'], fields: [],
      async run({ env }) {
        const r = await mc(env, 'GET', `/lists/${encodeURIComponent(env.MAILCHIMP_AUDIENCE_ID)}?fields=name,stats.member_count`);
        if (!r.ok) fail(r);
        return { type: 'message', title: 'Mailchimp is connected', text: `Audience "${r.j.name}" (${r.j.stats?.member_count ?? 0} contacts).` };
      },
    },
    {
      id: 'add_customer', label: 'Add customer to Mailchimp', placement: ['transaction'],
      fields: [{ name: 'email', label: 'Customer email', type: 'email' }, { name: 'name', label: 'Customer name', type: 'text' }],
      async run({ env, fields, context }) {
        const c = customerOf(context, fields) || {};
        const email = String(c.email || '').trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter the customer\'s email.');
        const status = String(env.MAILCHIMP_STATUS || '').trim().toLowerCase() === 'subscribed' ? 'subscribed' : 'pending';
        const [first, ...rest] = String(c.name || '').trim().split(/\s+/);
        const r = await mc(env, 'POST', `/lists/${encodeURIComponent(env.MAILCHIMP_AUDIENCE_ID)}/members`, { email_address: email, status, merge_fields: { FNAME: first || '', LNAME: rest.join(' ') }, tags: ['Stratek customer'] });
        if (!r.ok && r.j?.title === 'Member Exists') return { type: 'message', title: 'Already in Mailchimp', text: `${email} is already in your audience.` };
        if (!r.ok) fail(r);
        return { type: 'message', title: 'Added to Mailchimp', text: status === 'pending' ? `${email} was sent a confirmation email.` : `${email} was added.` };
      },
    },
  ],
};
