// quickbooks -- send a sale to QuickBooks Online as a Sales Receipt.
// Bring your own Intuit app (developer.intuit.com): paste its client ID / secret,
// add the redirect URI <connector>/oauth/quickbooks/callback in the app, then press
// "Connect QuickBooks". Test keys = the app's Development keys + a sandbox company.
//   OAuth: appcenter.intuit.com/connect/oauth2 -> oauth.platform.intuit.com/oauth2/v1/tokens/bearer
//   API:   quickbooks.api.intuit.com (sandbox-quickbooks.api.intuit.com) /v3/company/{realmId}/salesreceipt
// Buttons: Connect QuickBooks, Test QuickBooks (Integrations tab); Send sale to QuickBooks (sale details).
// Each sale line goes on one "Stratek sale" service item (made once, on your first income account).

import { sale } from './_util.js';
import { accessToken, oauthStatus, redirectUri } from './_oauth.js';

const api = (mode) => (mode === 'test' ? 'https://sandbox-quickbooks.api.intuit.com' : 'https://quickbooks.api.intuit.com');
const ITEM = 'Stratek sale';

async function qb(self, env, store, mode, method, path, body) {
  const t = await accessToken(self, env, store, mode);
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${api(mode)}/v3/company/${encodeURIComponent(t.realmId)}${path}${sep}minorversion=75`, { method, headers: { Authorization: `Bearer ${t.access_token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`QuickBooks: ${j?.Fault?.Error?.[0]?.Detail || j?.Fault?.Error?.[0]?.Message || `error ${res.status}`}`);
  return j;
}
const query = (self, env, store, mode, q) => qb(self, env, store, mode, 'GET', `/query?query=${encodeURIComponent(q)}`);

async function saleItem(self, env, store, mode) {
  const cached = await store.get('item');
  if (cached?.id) return cached.id;
  const found = await query(self, env, store, mode, `select Id from Item where Name = '${ITEM}'`);
  let id = found?.QueryResponse?.Item?.[0]?.Id;
  if (!id) {
    const acc = await query(self, env, store, mode, "select Id from Account where AccountType = 'Income' maxresults 1");
    const accId = acc?.QueryResponse?.Account?.[0]?.Id;
    if (!accId) throw new Error('QuickBooks: no income account found to book sales to.');
    const made = await qb(self, env, store, mode, 'POST', '/item', { Name: ITEM, Type: 'Service', IncomeAccountRef: { value: accId } });
    id = made.Item.Id;
  }
  await store.put('item', { id });
  return id;
}

const self = {
  id: 'quickbooks',
  name: 'QuickBooks Online',
  category: 'accounting',
  status: 'available',
  description: 'Send sales to QuickBooks Online as sales receipts.',
  docsUrl: 'https://developer.intuit.com/app/developer/qbo/docs/get-started',
  test: { support: 'sandbox', note: 'Use your Intuit app\'s Development keys with a QuickBooks sandbox company.' },
  secrets: [
    { name: 'QUICKBOOKS_CLIENT_ID', label: 'Intuit app client ID', hint: 'developer.intuit.com -> your app -> Keys & credentials (Production for Live, Development for Test). Add the redirect URI shown by "Connect QuickBooks".' },
    { name: 'QUICKBOOKS_CLIENT_SECRET', label: 'Intuit app client secret' },
  ],
  oauth: {
    authorizeUrl: () => 'https://appcenter.intuit.com/connect/oauth2',
    tokenUrl: () => 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    scope: () => 'com.intuit.quickbooks.accounting',
    clientId: (env) => env.QUICKBOOKS_CLIENT_ID,
    clientSecret: (env) => env.QUICKBOOKS_CLIENT_SECRET,
    tokenAuth: 'basic',
    afterConnect: ({ query: q }) => ({ realmId: q.realmId }),
  },
  actions: [
    {
      id: 'connect', label: 'Connect QuickBooks', placement: ['settings'], fields: [],
      async run({ oauthLink, claims, origin }) {
        if (claims?.src !== 'session') throw Object.assign(new Error('Only a person signed in to Stratek can connect QuickBooks.'), { status: 403 });
        return { type: 'link', title: 'Connect QuickBooks', text: `Redirect URI to add in your Intuit app: ${redirectUri(origin, 'quickbooks')}.`, url: await oauthLink(), linkLabel: 'Log in to QuickBooks' };
      },
    },
    {
      id: 'test', label: 'Test QuickBooks', placement: ['settings'], fields: [],
      async run({ env, store, mode }) {
        if (!(await oauthStatus(store)).connected) return { type: 'message', title: 'Not connected yet', text: 'Press "Connect QuickBooks" first.' };
        const t = await store.get('oauth');
        const c = await qb(self, env, store, mode, 'GET', `/companyinfo/${encodeURIComponent(t.realmId)}`);
        return { type: 'message', title: 'QuickBooks is connected', text: `Company "${c.CompanyInfo?.CompanyName || '?'}"${mode === 'test' ? ' (sandbox)' : ''}.` };
      },
    },
    {
      id: 'send_sale', label: 'Send sale to QuickBooks', placement: ['transaction'], fields: [],
      async run({ env, store, context, mode }) {
        const tx = sale(context);
        const done = await store.get(`tx:${tx.id}`);
        if (done) return { type: 'status', title: 'QuickBooks', status: 'Already sent', text: `Sales receipt ${done.docNumber || done.id}.` };
        const itemId = await saleItem(self, env, store, mode);
        const items = (tx.items || []).length ? tx.items : [{ name: `Sale #${tx.id}`, price: Number(tx.amount), qty: 1 }];
        const lines = items.map((i) => ({ Amount: Math.round(Number(i.price) * Number(i.qty || 1) * 100) / 100, Description: String(i.name).slice(0, 4000), DetailType: 'SalesItemLineDetail', SalesItemLineDetail: { ItemRef: { value: itemId }, Qty: Number(i.qty || 1), UnitPrice: Number(i.price) } }));
        const extra = Math.round((Number(tx.amount) - lines.reduce((s, l) => s + l.Amount, 0)) * 100) / 100;
        if (Math.abs(extra) >= 0.01) lines.push({ Amount: extra, Description: 'VAT, service charge and discounts (from the Stratek bill)', DetailType: 'SalesItemLineDetail', SalesItemLineDetail: { ItemRef: { value: itemId }, Qty: 1, UnitPrice: extra } });
        const r = await qb(self, env, store, mode, 'POST', '/salesreceipt', { Line: lines, PrivateNote: `Stratek sale #${tx.id}${tx.reference ? ` -- ${tx.reference}` : ''}`.slice(0, 4000), TxnDate: String(tx.createdAt || new Date().toISOString()).slice(0, 10) });
        await store.put(`tx:${tx.id}`, { id: r.SalesReceipt?.Id, docNumber: r.SalesReceipt?.DocNumber || null, at: new Date().toISOString() });
        return { type: 'status', title: 'QuickBooks', status: 'Sent', text: `Sales receipt ${r.SalesReceipt?.DocNumber || r.SalesReceipt?.Id} for ${tx.currency} ${tx.amount}.` };
      },
    },
  ],
};
export default self;
