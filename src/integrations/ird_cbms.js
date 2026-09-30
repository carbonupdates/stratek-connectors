// ird_cbms -- report a sale's bill (and a sales return) to Nepal IRD's Central Billing
// Monitoring System (CBMS). Needs the CBMS username/password IRD issues for your
// billing software, and your PAN.
//   POST https://cbapi.ird.gov.np/api/bill         sales bill
//   POST https://cbapi.ird.gov.np/api/billreturn   sales return (credit note)
//   Dates are Bikram Sambat (YYYY.MM.DD), fiscal year YYYY.0YY (e.g. 2083.084).
//   Response: 200 ok, 100 wrong credentials, 101 bill already exists / (return) bill missing,
//             102/103/104 data problems, 105 bill does not exist.
//   Source: IRD CBMS API document (ird.gov.np).
// Buttons (sale details): Report bill to IRD, Report return to IRD. Test mode sales are never sent.
// IMPORTANT: CBMS is for tax invoices from IRD-approved billing software. Stratek's own bill
// says "not a tax invoice" -- check with IRD / your accountant before using this.

import { sale } from './_util.js';
import { toBS, bsString, fiscalYear } from './_nepal.js';

const url = (env, path) => `${String(env.IRD_API_URL || 'https://cbapi.ird.gov.np').replace(/\/+$/, '')}${path}`;
const CODES = { 100: 'IRD did not accept the CBMS username / password / PAN.', 101: 'IRD already has this bill.', 102: 'IRD could not save the bill (check the amounts).', 103: 'IRD had an unknown problem -- try again later.', 104: 'IRD said the bill data is invalid.', 105: 'IRD has no such bill (report the bill first).' };
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function amounts(tx) {
  const b = tx.bill;
  const total = r2(b?.total ?? tx.amount);
  if (!b) return { total_sales: total, taxable_sales_vat: 0, vat: 0, tax_exempted_sales: total };
  const taxable = r2(b.taxable), vat = r2(b.vat);
  return { total_sales: total, taxable_sales_vat: taxable, vat, tax_exempted_sales: r2(Math.max(0, total - taxable - vat)) };
}

async function post(env, path, body) {
  const res = await fetch(url(env, path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text = await res.text();
  const code = Number(String(text).replace(/[^0-9]/g, '').slice(0, 3)) || res.status;
  return { code, text };
}

function base(env, fields, tx) {
  const pan = String(env.IRD_SELLER_PAN || '').trim();
  if (!/^\d{9}$/.test(pan)) throw new Error('IRD: the seller PAN must be 9 digits (Set up).');
  const buyerPan = String(fields.buyerPan || '').trim();
  if (buyerPan && !/^\d{9}$/.test(buyerPan)) throw new Error('Buyer PAN must be 9 digits (or leave it empty).');
  return { username: env.IRD_USERNAME, password: env.IRD_PASSWORD, seller_pan: pan, buyer_pan: buyerPan, buyer_name: String(fields.buyerName || tx?.customer || '').slice(0, 100), excisable_amount: 0, excise: 0, taxable_sales_hst: 0, hst: 0, amount_for_esf: 0, esf: 0, export_sales: 0, isrealtime: true, datetimeClient: new Date().toISOString() };
}

export default {
  id: 'ird_cbms',
  name: 'Nepal IRD e-billing (CBMS)',
  category: 'accounting',
  status: 'available',
  description: 'Report bills and sales returns to Nepal IRD\'s Central Billing Monitoring System (CBMS).',
  docsUrl: 'https://ird.gov.np/content/9052/cbmsapitechnicaldocumentfor/',
  test: { support: 'none', note: 'CBMS has no sandbox. Test-mode sales are never reported to IRD.' },
  secrets: [
    { name: 'IRD_USERNAME', label: 'IRD CBMS username', hint: 'Issued by IRD for your approved billing software.' },
    { name: 'IRD_PASSWORD', label: 'IRD CBMS password' },
    { name: 'IRD_SELLER_PAN', label: 'Seller PAN', hint: 'Your business PAN / VAT number (9 digits).' },
    { name: 'IRD_API_URL', label: 'CBMS address', hint: 'Optional. Leave empty for https://cbapi.ird.gov.np.', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Check IRD settings', placement: ['settings'], fields: [],
      async run({ env }) {
        base(env, {}, null);
        const bs = toBS();
        return { type: 'message', title: 'IRD settings look right', text: `PAN ${env.IRD_SELLER_PAN}. Today is ${bsString(bs)} (fiscal year ${fiscalYear(bs)}). CBMS has no test service -- your first reported bill confirms the login.` };
      },
    },
    {
      id: 'report_bill', label: 'Report bill to IRD', placement: ['transaction'],
      fields: [
        { name: 'invoiceNumber', label: 'Invoice number (empty = sale number)', type: 'text' },
        { name: 'buyerPan', label: 'Buyer PAN (optional)', type: 'text' },
        { name: 'buyerName', label: 'Buyer name (optional)', type: 'text' },
      ],
      async run({ env, fields, context, store, mode }) {
        if (mode === 'test') throw new Error('Test-mode sales are never reported to IRD.');
        const tx = sale(context);
        const done = await store.get(`bill:${tx.id}`);
        if (done?.reported) return { type: 'status', title: 'IRD', status: 'Already reported', text: `Invoice ${done.invoice} was reported on ${done.at}.` };
        const bs = toBS(tx.createdAt || new Date());
        const invoice = String(fields.invoiceNumber || tx.id).trim().slice(0, 50);
        const body = { ...base(env, { ...fields, buyerName: fields.buyerName || context?.customer?.name || '' }, tx), fiscal_year: fiscalYear(bs), invoice_number: invoice, invoice_date: bsString(bs), ...amounts(tx) };
        const r = await post(env, '/api/bill', body);
        if (r.code !== 200 && r.code !== 101) throw new Error(`IRD: ${CODES[r.code] || r.text || `error ${r.code}`}`);
        await store.put(`bill:${tx.id}`, { reported: true, invoice, fiscalYear: body.fiscal_year, date: body.invoice_date, at: new Date().toISOString() });
        return { type: 'status', title: 'IRD', status: r.code === 101 ? 'Already at IRD' : 'Reported', text: `Invoice ${invoice}, ${body.invoice_date} (FY ${body.fiscal_year}), total Rs ${body.total_sales}, VAT Rs ${body.vat}.` };
      },
    },
    {
      id: 'report_return', label: 'Report return to IRD', placement: ['transaction'],
      fields: [
        { name: 'reason', label: 'Reason for return', type: 'text', required: true },
        { name: 'creditNoteNumber', label: 'Credit note number (empty = CN-sale number)', type: 'text' },
      ],
      async run({ env, fields, context, store, mode }) {
        if (mode === 'test') throw new Error('Test-mode sales are never reported to IRD.');
        const tx = sale(context);
        const bill = await store.get(`bill:${tx.id}`);
        if (!bill?.reported) throw new Error('Report the bill to IRD first.');
        const done = await store.get(`return:${tx.id}`);
        if (done) return { type: 'status', title: 'IRD', status: 'Already reported', text: `Credit note ${done.creditNote}.` };
        const bs = toBS();
        const creditNote = String(fields.creditNoteNumber || `CN-${tx.id}`).trim().slice(0, 50);
        const body = { ...base(env, fields, tx), fiscal_year: fiscalYear(bs), ref_invoice_number: bill.invoice, credit_note_number: creditNote, credit_note_date: bsString(bs), reason_for_return: String(fields.reason).slice(0, 200), ...amounts(tx) };
        const r = await post(env, '/api/billreturn', body);
        if (r.code !== 200) throw new Error(`IRD: ${CODES[r.code] || r.text || `error ${r.code}`}`);
        await store.put(`return:${tx.id}`, { creditNote, at: new Date().toISOString() });
        return { type: 'status', title: 'IRD', status: 'Return reported', text: `Credit note ${creditNote} for invoice ${bill.invoice}.` };
      },
    },
  ],
};
