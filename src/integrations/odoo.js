// odoo -- send Stratek sales to Odoo (Online, Odoo.sh or your own server) as customer invoices.
// Odoo -> your user -> Preferences / Account Security -> New API key. Invoicing (or
// Accounting) must be installed. Each sale becomes one invoice for the walk-in customer (or
// the online-store customer) with one line per item plus a VAT / service / rounding line so
// the total matches the Stratek bill. Draft by default.
//   API: JSON-RPC https://<db>.odoo.com/jsonrpc -- common.authenticate, object.execute_kw
//        (res.partner search / create, account.move create, action_post)
// Buttons: Test Odoo (Integrations tab); Send sale to Odoo (sale details).

import { sale } from './_util.js';
import { readJson } from './_ship.js';
import { customerOf } from './_hooks.js';
import { folioLines } from './cloudbeds.js';

function site(env) {
  let u; try { u = new URL(String(env.ODOO_URL || '').trim()); } catch { throw new Error('Odoo: paste your Odoo address (https://...) in Set up.'); }
  if (u.protocol !== 'https:') throw new Error('Odoo: the address must start with https://');
  return u.origin;
}
const db = (env) => String(env.ODOO_DB || new URL(site(env)).hostname.split('.')[0]).trim();

async function rpc(env, service, method, args) {
  const res = await fetch(`${site(env)}/jsonrpc`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: Date.now(), params: { service, method, args } }) });
  const j = await readJson(res);
  if (!res.ok) throw new Error(`Odoo answered ${res.status}.`);
  if (j?.error) throw new Error(`Odoo: ${j.error.data?.message || j.error.message}`.slice(0, 300));
  return j?.result;
}

async function session(env, store) {
  const key = `${db(env)}|${String(env.ODOO_LOGIN).trim()}`;
  const have = await store.get('uid');
  if (have?.key === key) return have.uid;
  const uid = await rpc(env, 'common', 'authenticate', [db(env), String(env.ODOO_LOGIN).trim(), String(env.ODOO_API_KEY).trim(), {}]);
  if (!uid) throw new Error('Odoo did not accept the login / API key (check the database name too).');
  await store.put('uid', { key, uid });
  return uid;
}
const call = async (env, store, model, method, args, kwargs = {}) => rpc(env, 'object', 'execute_kw', [db(env), await session(env, store), String(env.ODOO_API_KEY).trim(), model, method, args, kwargs]);
const today = () => new Date(Date.now() + 345 * 60000).toISOString().slice(0, 10);

export default {
  id: 'odoo',
  name: 'Odoo',
  category: 'accounting',
  status: 'available',
  color: '#714B67',
  description: 'Send sales to Odoo as customer invoices (draft or posted).',
  docsUrl: 'https://www.odoo.com/documentation/18.0/developer/reference/external_api.html',
  test: { support: 'none', note: 'Use a duplicate / test database under Test keys if you have one; otherwise invoices are drafts until you post them.' },
  secrets: [
    { name: 'ODOO_URL', label: 'Odoo address', hint: 'e.g. https://chyau.odoo.com' },
    { name: 'ODOO_DB', label: 'Database name', hint: 'Optional for Odoo Online (the part before .odoo.com).', optional: true },
    { name: 'ODOO_LOGIN', label: 'Login (email)', hint: 'The Odoo user the API key belongs to.' },
    { name: 'ODOO_API_KEY', label: 'API key', hint: 'Odoo -> your user -> Account Security -> New API key.' },
    { name: 'ODOO_CUSTOMER', label: 'Walk-in customer name', hint: 'Optional, default "Walk-in customer" (created if missing).', optional: true },
    { name: 'ODOO_POST', label: 'Post invoices (yes / no)', hint: 'Optional, default no -- invoices stay drafts.', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test Odoo', placement: ['settings'], fields: [],
      async run({ env, store }) {
        const v = await rpc(env, 'common', 'version', []);
        await store.delete('uid');
        const uid = await session(env, store);
        return { type: 'message', title: 'Odoo is connected', text: `Odoo ${v?.server_version || ''}, database ${db(env)}, user ID ${uid}.` };
      },
    },
    {
      id: 'send_sale', label: 'Send sale to Odoo', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode }) {
        const tx = sale(context);
        const had = await store.get(`tx:${tx.id}`);
        if (had) return { type: 'message', title: 'Already in Odoo', text: `Sale #${tx.id} is invoice ID ${had.move}.` };
        const c = customerOf(context);
        const name = c?.name || String(env.ODOO_CUSTOMER || 'Walk-in customer').trim();
        const found = await call(env, store, 'res.partner', 'search', [[['name', '=', name]]], { limit: 1 });
        const partner = found?.[0] || await call(env, store, 'res.partner', 'create', [{ name, ...(c?.email ? { email: c.email } : {}), ...(c?.phone ? { phone: c.phone } : {}) }]);
        const move = await call(env, store, 'account.move', 'create', [{
          move_type: 'out_invoice', partner_id: partner, invoice_date: today(), ref: `${mode === 'test' ? 'TEST ' : ''}Stratek #${tx.id}`,
          narration: tx.reference ? `Stratek sale #${tx.id} (${tx.reference})` : `Stratek sale #${tx.id}`,
          invoice_line_ids: folioLines(tx).map((l) => [0, 0, { name: l.name, quantity: l.qty, price_unit: l.price, tax_ids: [[6, 0, []]] }]),
        }]);
        const post = /^y/i.test(String(env.ODOO_POST || ''));
        if (post) await call(env, store, 'account.move', 'action_post', [[move]]);
        await store.put(`tx:${tx.id}`, { move, at: new Date().toISOString() });
        return { type: 'message', title: 'Sent to Odoo', text: `Invoice ID ${move} (${post ? 'posted' : 'draft'}) for ${tx.currency} ${tx.amount}.` };
      },
    },
  ],
};
