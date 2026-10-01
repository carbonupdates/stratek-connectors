// erpnext -- send Stratek sales to ERPNext (or any Frappe-based ERP) as Sales Invoices.
// ERPNext -> User -> your integration user -> Settings -> API Access -> Generate Keys
// (API key + secret). The user needs Sales Invoice, Customer and Item permissions.
// Each sale becomes one invoice for the walk-in customer (or the online-store customer),
// one line per item on a single service item ("Stratek sale", created if missing), plus a
// line for VAT / service / rounding so the total matches the Stratek bill. Draft by default.
//   API: https://<site>/api (header Authorization: token key:secret)
//        GET /method/frappe.auth.get_logged_user, /resource/Customer, /resource/Item,
//        POST /resource/Sales Invoice
// Buttons: Test ERPNext (Integrations tab); Send sale to ERPNext (sale details).

import { sale } from './_util.js';
import { readJson } from './_ship.js';
import { customerOf } from './_hooks.js';
import { folioLines } from './cloudbeds.js';

function site(env) {
  let u; try { u = new URL(String(env.ERPNEXT_URL || '').trim()); } catch { throw new Error('ERPNext: paste your site address (https://...) in Set up.'); }
  if (u.protocol !== 'https:') throw new Error('ERPNext: the site address must start with https://');
  return u.origin;
}

async function erp(env, method, path, body, { allow404 = false } = {}) {
  const res = await fetch(`${site(env)}/api${path}`, { method, headers: { Authorization: `token ${String(env.ERPNEXT_API_KEY).trim()}:${String(env.ERPNEXT_API_SECRET).trim()}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (allow404 && res.status === 404) return null;
  const j = await readJson(res);
  if (res.status === 401 || res.status === 403) throw new Error('ERPNext refused the API key / secret (or the user lacks permission).');
  if (!res.ok) { let msg = j?.exception || j?.message; try { msg = JSON.parse(JSON.parse(j._server_messages)[0]).message; } catch { /* keep */ } throw new Error(`ERPNext: ${String(msg || `error ${res.status}`).replace(/<[^>]+>/g, '').slice(0, 300)}`); }
  return j?.data ?? j;
}

const enc = encodeURIComponent;
async function ensure(env, doctype, name, create) {
  if (await erp(env, 'GET', `/resource/${enc(doctype)}/${enc(name)}`, null, { allow404: true })) return name;
  return (await erp(env, 'POST', `/resource/${enc(doctype)}`, create)).name;
}
const today = () => new Date(Date.now() + 345 * 60000).toISOString().slice(0, 10);

export default {
  id: 'erpnext',
  name: 'ERPNext',
  category: 'accounting',
  status: 'available',
  color: '#0089FF',
  description: 'Send sales to ERPNext / Frappe as Sales Invoices (draft or submitted).',
  docsUrl: 'https://docs.frappe.io/framework/user/en/api/rest',
  test: { support: 'none', note: 'Point Test keys at a test ERPNext site if you have one; otherwise invoices are drafts until you submit them.' },
  secrets: [
    { name: 'ERPNEXT_URL', label: 'ERPNext site address', hint: 'e.g. https://chyau.erpnext.com or your own server.' },
    { name: 'ERPNEXT_API_KEY', label: 'API key', hint: 'User -> Settings -> API Access -> Generate Keys.' },
    { name: 'ERPNEXT_API_SECRET', label: 'API secret' },
    { name: 'ERPNEXT_COMPANY', label: 'Company', hint: 'Optional: the company name in ERPNext (default: the user\'s default company).', optional: true },
    { name: 'ERPNEXT_CUSTOMER', label: 'Walk-in customer name', hint: 'Optional, default "Walk-in Customer" (created if missing).', optional: true },
    { name: 'ERPNEXT_ITEM_GROUP', label: 'Item group for the "Stratek sale" item', hint: 'Optional, default Services.', optional: true },
    { name: 'ERPNEXT_SUBMIT', label: 'Submit invoices (yes / no)', hint: 'Optional, default no -- invoices stay drafts for your accountant.', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test ERPNext', placement: ['settings'], fields: [],
      async run({ env }) {
        const who = await erp(env, 'GET', '/method/frappe.auth.get_logged_user');
        return { type: 'message', title: 'ERPNext is connected', text: `Signed in as ${who?.message || who} on ${site(env).replace(/^https:\/\//, '')}.` };
      },
    },
    {
      id: 'send_sale', label: 'Send sale to ERPNext', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode }) {
        const tx = sale(context);
        const had = await store.get(`tx:${tx.id}`);
        if (had) return { type: 'message', title: 'Already in ERPNext', text: `Sale #${tx.id} is invoice ${had.invoice}.` };
        const cust = customerOf(context)?.name || String(env.ERPNEXT_CUSTOMER || 'Walk-in Customer').trim();
        const customer = await ensure(env, 'Customer', cust, { customer_name: cust, customer_type: 'Individual' });
        const item = await ensure(env, 'Item', 'STRATEK-SALE', { item_code: 'STRATEK-SALE', item_name: 'Stratek sale', item_group: String(env.ERPNEXT_ITEM_GROUP || 'Services').trim(), stock_uom: 'Nos', is_stock_item: 0, is_sales_item: 1 });
        const submit = /^y/i.test(String(env.ERPNEXT_SUBMIT || ''));
        const inv = await erp(env, 'POST', `/resource/${enc('Sales Invoice')}`, {
          customer, posting_date: today(), due_date: today(), set_posting_time: 1, currency: tx.currency,
          ...(env.ERPNEXT_COMPANY ? { company: String(env.ERPNEXT_COMPANY).trim() } : {}),
          remarks: `${mode === 'test' ? '[TEST] ' : ''}Stratek sale #${tx.id}${tx.reference ? ` (${tx.reference})` : ''}`, po_no: `STRATEK-${tx.id}`,
          items: folioLines(tx).map((l) => ({ item_code: item, item_name: l.name.slice(0, 140), description: l.name, qty: l.qty, rate: l.price, uom: 'Nos', conversion_factor: 1 })),
          docstatus: submit ? 1 : 0,
        });
        await store.put(`tx:${tx.id}`, { invoice: inv.name, at: new Date().toISOString() });
        return { type: 'message', title: 'Sent to ERPNext', text: `Sales Invoice ${inv.name} (${submit ? 'submitted' : 'draft'}) for ${tx.currency} ${inv.grand_total ?? tx.amount}.` };
      },
    },
  ],
};
