// xero -- send a sale to Xero as an approved sales invoice.
// Bring your own Xero app (developer.xero.com -> My Apps -> Web app): paste its client
// ID / secret, add the redirect URI <connector>/oauth/xero/callback, press "Connect Xero".
//   OAuth: login.xero.com/identity/connect/authorize -> identity.xero.com/connect/token
//   API:   api.xero.com/connections (tenant), api.xero.com/api.xro/2.0/Invoices
// Buttons: Connect Xero, Test Xero (Integrations tab); Send sale to Xero (sale details).
// Xero has no sandbox -- use its free Demo Company for trying it (live keys).

import { sale } from './_util.js';
import { accessToken, oauthStatus, redirectUri } from './_oauth.js';

async function xero(self, env, store, mode, method, path, body) {
  const t = await accessToken(self, env, store, mode);
  const res = await fetch(`https://api.xero.com${path}`, { method, headers: { Authorization: `Bearer ${t.access_token}`, Accept: 'application/json', ...(t.tenantId ? { 'xero-tenant-id': t.tenantId } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => null);
  if (!res.ok) {
    const v = j?.Elements?.[0]?.ValidationErrors?.map((e) => e.Message).join('; ');
    throw new Error(`Xero: ${v || j?.Detail || j?.Message || j?.Title || `error ${res.status}`}`);
  }
  return j;
}

const self = {
  id: 'xero',
  name: 'Xero',
  category: 'accounting',
  status: 'available',
  description: 'Send sales to Xero as approved sales invoices.',
  docsUrl: 'https://developer.xero.com/documentation/api/accounting/invoices',
  test: { support: 'none', note: 'Xero has no sandbox: connect the free Xero Demo Company to try it.' },
  secrets: [
    { name: 'XERO_CLIENT_ID', label: 'Xero app client ID', hint: 'developer.xero.com -> My Apps -> New app (Web app). Add the redirect URI shown by "Connect Xero".' },
    { name: 'XERO_CLIENT_SECRET', label: 'Xero app client secret' },
    { name: 'XERO_SALES_ACCOUNT', label: 'Sales account code', hint: 'Optional, default 200 (Sales).', optional: true },
    { name: 'XERO_SCOPES', label: 'Scopes', hint: 'Optional. Default: offline_access accounting.transactions accounting.contacts. Newer apps may need accounting.invoices instead of accounting.transactions.', optional: true },
  ],
  oauth: {
    authorizeUrl: () => 'https://login.xero.com/identity/connect/authorize',
    tokenUrl: () => 'https://identity.xero.com/connect/token',
    scope: (env) => String(env.XERO_SCOPES || 'offline_access accounting.transactions accounting.contacts').trim(),
    clientId: (env) => env.XERO_CLIENT_ID,
    clientSecret: (env) => env.XERO_CLIENT_SECRET,
    tokenAuth: 'basic',
    async afterConnect({ tokens }) {
      const res = await fetch('https://api.xero.com/connections', { headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' } });
      const list = await res.json().catch(() => []);
      const org = Array.isArray(list) ? list.find((c) => c.tenantType === 'ORGANISATION') || list[0] : null;
      if (!org?.tenantId) throw new Error('Xero: no organisation was shared. Connect again and pick your organisation.');
      return { tenantId: org.tenantId, tenantName: org.tenantName || null };
    },
  },
  actions: [
    {
      id: 'connect', label: 'Connect Xero', placement: ['settings'], fields: [],
      async run({ oauthLink, claims, origin }) {
        if (claims?.src !== 'session') throw Object.assign(new Error('Only a person signed in to Stratek can connect Xero.'), { status: 403 });
        return { type: 'link', title: 'Connect Xero', text: `Redirect URI to add in your Xero app: ${redirectUri(origin, 'xero')}.`, url: await oauthLink(), linkLabel: 'Log in to Xero' };
      },
    },
    {
      id: 'test', label: 'Test Xero', placement: ['settings'], fields: [],
      async run({ env, store, mode }) {
        if (!(await oauthStatus(store)).connected) return { type: 'message', title: 'Not connected yet', text: 'Press "Connect Xero" first.' };
        const o = await xero(self, env, store, mode, 'GET', '/api.xro/2.0/Organisation');
        return { type: 'message', title: 'Xero is connected', text: `Organisation "${o.Organisations?.[0]?.Name || '?'}" (${o.Organisations?.[0]?.BaseCurrency || '?'}).` };
      },
    },
    {
      id: 'send_sale', label: 'Send sale to Xero', placement: ['transaction'], fields: [],
      async run({ env, store, context, mode }) {
        const tx = sale(context);
        const done = await store.get(`tx:${tx.id}`);
        if (done) return { type: 'status', title: 'Xero', status: 'Already sent', text: `Invoice ${done.number}.` };
        const account = String(env.XERO_SALES_ACCOUNT || '200').trim();
        const items = (tx.items || []).length ? tx.items : [{ name: `Sale #${tx.id}`, price: Number(tx.amount), qty: 1 }];
        const LineItems = items.map((i) => ({ Description: String(i.name).slice(0, 4000), Quantity: Number(i.qty || 1), UnitAmount: Number(i.price), AccountCode: account }));
        const net = LineItems.reduce((s, l) => s + l.Quantity * l.UnitAmount, 0);
        const extra = Math.round((Number(tx.amount) - net) * 100) / 100;
        if (Math.abs(extra) >= 0.01) LineItems.push({ Description: 'VAT, service charge and discounts (from the Stratek bill)', Quantity: 1, UnitAmount: extra, AccountCode: account });
        const date = String(tx.createdAt || new Date().toISOString()).slice(0, 10);
        const c = context?.customer;
        const r = await xero(self, env, store, mode, 'POST', '/api.xro/2.0/Invoices', { Invoices: [{ Type: 'ACCREC', Contact: { Name: c?.name || 'Walk-in customer', ...(c?.email ? { EmailAddress: c.email } : {}) }, Date: date, DueDate: date, LineAmountTypes: 'NoTax', LineItems, Reference: `Stratek sale #${tx.id}`, CurrencyCode: tx.currency, Status: 'AUTHORISED' }] });
        const inv = r.Invoices?.[0] || {};
        await store.put(`tx:${tx.id}`, { id: inv.InvoiceID, number: inv.InvoiceNumber, at: new Date().toISOString() });
        return { type: 'status', title: 'Xero', status: 'Sent', text: `Invoice ${inv.InvoiceNumber || inv.InvoiceID} for ${tx.currency} ${tx.amount} (approved).` };
      },
    },
  ],
};
export default self;
