// zoho_books -- send a sale to Zoho Books as an invoice.
// Bring your own Zoho client (api-console.zoho.com -> Server-based application): paste
// its client ID / secret, pick your Zoho data centre, add the redirect URI
// <connector>/oauth/zoho_books/callback, press "Connect Zoho Books".
//   OAuth: accounts.zoho.<dc>/oauth/v2/auth -> /oauth/v2/token (access_type=offline)
//   API:   www.zohoapis.<dc>/books/v3/... ?organization_id=
// Buttons: Connect Zoho Books, Test Zoho Books (Integrations tab); Send sale to Zoho Books (sale details).

import { sale } from './_util.js';
import { accessToken, oauthStatus, redirectUri } from './_oauth.js';

const DCS = ['com', 'eu', 'in', 'com.au', 'jp', 'ca', 'com.cn', 'sa'];
const dc = (env) => { const d = String(env.ZOHO_DC || 'com').trim().replace(/^\./, ''); if (!DCS.includes(d)) throw new Error(`Zoho data centre must be one of: ${DCS.join(', ')}.`); return d; };

async function zoho(self, env, store, mode, method, path, body) {
  const t = await accessToken(self, env, store, mode);
  const u = new URL(`https://www.zohoapis.${dc(env)}/books/v3${path}`);
  const org = env.ZOHO_ORG_ID || t.orgId;
  if (org) u.searchParams.set('organization_id', org);
  const res = await fetch(u, { method, headers: { Authorization: `Zoho-oauthtoken ${t.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => null);
  if (!res.ok || (j && j.code && j.code !== 0)) throw new Error(`Zoho Books: ${j?.message || `error ${res.status}`}`);
  return j;
}

async function contactId(self, env, store, mode, name) {
  const key = `contact:${name}`;
  const cached = await store.get(key);
  if (cached) return cached;
  const f = await zoho(self, env, store, mode, 'GET', `/contacts?contact_name=${encodeURIComponent(name)}`);
  let id = f.contacts?.[0]?.contact_id;
  if (!id) id = (await zoho(self, env, store, mode, 'POST', '/contacts', { contact_name: name, contact_type: 'customer' })).contact?.contact_id;
  await store.put(key, id);
  return id;
}

const self = {
  id: 'zoho_books',
  name: 'Zoho Books',
  category: 'accounting',
  status: 'available',
  description: 'Send sales to Zoho Books as invoices.',
  docsUrl: 'https://www.zoho.com/books/api/v3/',
  test: { support: 'none', note: 'Zoho Books has no sandbox: use a trial organisation to try it.' },
  secrets: [
    { name: 'ZOHO_CLIENT_ID', label: 'Zoho client ID', hint: 'api-console.zoho.com -> Add client -> Server-based application. Add the redirect URI shown by "Connect Zoho Books".' },
    { name: 'ZOHO_CLIENT_SECRET', label: 'Zoho client secret' },
    { name: 'ZOHO_DC', label: 'Zoho data centre', hint: 'Optional: com (default), eu, in, com.au, jp, ca, com.cn, sa -- the end of your Zoho address.', optional: true },
    { name: 'ZOHO_ORG_ID', label: 'Organization ID', hint: 'Optional. Zoho Books -> Settings -> Organization profile. Empty = your first organisation.', optional: true },
  ],
  oauth: {
    authorizeUrl: (env) => `https://accounts.zoho.${dc(env)}/oauth/v2/auth`,
    tokenUrl: (env) => `https://accounts.zoho.${dc(env)}/oauth/v2/token`,
    scope: () => 'ZohoBooks.invoices.CREATE,ZohoBooks.invoices.READ,ZohoBooks.contacts.CREATE,ZohoBooks.contacts.READ,ZohoBooks.settings.READ',
    clientId: (env) => env.ZOHO_CLIENT_ID,
    clientSecret: (env) => env.ZOHO_CLIENT_SECRET,
    tokenAuth: 'body',
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    async afterConnect({ tokens, env }) {
      if (env.ZOHO_ORG_ID) return { orgId: env.ZOHO_ORG_ID };
      const res = await fetch(`https://www.zohoapis.${dc(env)}/books/v3/organizations`, { headers: { Authorization: `Zoho-oauthtoken ${tokens.access_token}` } });
      const j = await res.json().catch(() => null);
      const org = j?.organizations?.find((o) => o.is_default_org) || j?.organizations?.[0];
      return { orgId: org?.organization_id || null, orgName: org?.name || null };
    },
  },
  actions: [
    {
      id: 'connect', label: 'Connect Zoho Books', placement: ['settings'], fields: [],
      async run({ oauthLink, claims, origin }) {
        if (claims?.src !== 'session') throw Object.assign(new Error('Only a person signed in to Stratek can connect Zoho Books.'), { status: 403 });
        return { type: 'link', title: 'Connect Zoho Books', text: `Redirect URI to add in your Zoho client: ${redirectUri(origin, 'zoho_books')}.`, url: await oauthLink(), linkLabel: 'Log in to Zoho' };
      },
    },
    {
      id: 'test', label: 'Test Zoho Books', placement: ['settings'], fields: [],
      async run({ env, store, mode }) {
        if (!(await oauthStatus(store)).connected) return { type: 'message', title: 'Not connected yet', text: 'Press "Connect Zoho Books" first.' };
        const t = await store.get('oauth');
        const o = await zoho(self, env, store, mode, 'GET', '/organizations');
        const org = o.organizations?.find((x) => x.organization_id === (env.ZOHO_ORG_ID || t.orgId)) || o.organizations?.[0];
        return { type: 'message', title: 'Zoho Books is connected', text: `Organisation "${org?.name || '?'}" (${org?.currency_code || '?'}).` };
      },
    },
    {
      id: 'send_invoice', label: 'Send sale to Zoho Books', placement: ['transaction'], fields: [],
      async run({ env, store, context, mode }) {
        const tx = sale(context);
        const done = await store.get(`tx:${tx.id}`);
        if (done) return { type: 'status', title: 'Zoho Books', status: 'Already sent', text: `Invoice ${done.number}.` };
        const customer = await contactId(self, env, store, mode, context?.customer?.name || 'Walk-in customer');
        const items = (tx.items || []).length ? tx.items : [{ name: `Sale #${tx.id}`, price: Number(tx.amount), qty: 1 }];
        const line_items = items.map((i) => ({ name: String(i.name).slice(0, 100), rate: Number(i.price), quantity: Number(i.qty || 1) }));
        const extra = Math.round((Number(tx.amount) - line_items.reduce((s, l) => s + l.rate * l.quantity, 0)) * 100) / 100;
        if (Math.abs(extra) >= 0.01) line_items.push({ name: 'VAT, service charge and discounts', rate: extra, quantity: 1 });
        const r = await zoho(self, env, store, mode, 'POST', '/invoices', { customer_id: customer, date: String(tx.createdAt || new Date().toISOString()).slice(0, 10), reference_number: `Stratek #${tx.id}`, line_items });
        await store.put(`tx:${tx.id}`, { id: r.invoice?.invoice_id, number: r.invoice?.invoice_number, at: new Date().toISOString() });
        return { type: 'status', title: 'Zoho Books', status: 'Sent', text: `Invoice ${r.invoice?.invoice_number || r.invoice?.invoice_id} for ${tx.currency} ${tx.amount}.` };
      },
    },
  ],
};
export default self;
