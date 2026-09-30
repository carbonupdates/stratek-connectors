// esewa -- eSewa ePay v2 for a sale: the customer scans a QR that opens a short page on
// this connector, which posts the signed form to eSewa. eSewa sends them back with a signed
// result; the connector checks the signature AND asks eSewa's status API, then tells Stratek
// (signed "payment.succeeded" -> "Paid online"; a person still settles).
//   Form:   https://rc-epay.esewa.com.np/api/epay/main/v2/form (test) | https://epay.esewa.com.np/api/epay/main/v2/form
//   Status: https://rc.esewa.com.np/api/epay/transaction/status/ (test) | https://esewa.com.np/api/epay/transaction/status/
//   Signature: base64 HMAC-SHA256(secret, "total_amount=..,transaction_uuid=..,product_code=..")
//   Docs: https://developer.esewa.com.np/pages/Epay
// Buttons: Test eSewa (Integrations tab); Pay with eSewa (under the payment QR); Check eSewa payment (sale details).
// Refunds are done in the eSewa merchant portal (no public refund API).

import { sale } from './_util.js';
import { paisa, rupees, requireNpr, randomToken, gatewayFormPage, resultPage, emitPaid } from './_nepal.js';

const FORM = { test: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form', live: 'https://epay.esewa.com.np/api/epay/main/v2/form' };
const STATUS = { test: 'https://rc.esewa.com.np/api/epay/transaction/status/', live: 'https://esewa.com.np/api/epay/transaction/status/' };
const m = (mode) => (mode === 'test' ? 'test' : 'live');

async function hmacB64(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)))));
}
const signFields = (obj, names) => names.split(',').map((n) => `${n}=${obj[n]}`).join(',');

async function status(env, mode, s) {
  const u = new URL(STATUS[m(mode)]);
  u.search = new URLSearchParams({ product_code: env.ESEWA_MERCHANT_CODE, total_amount: rupees(s.amount), transaction_uuid: s.uuid }).toString();
  const res = await fetch(u);
  const j = await res.json().catch(() => null);
  if (!res.ok && !j?.status) throw new Error(`eSewa status check failed (${res.status}).`);
  return j || {};
}

async function checkAndReport({ env, mode, store, emit, txId }) {
  const s = await store.get(`tx:${txId}`);
  if (!s) return { known: false };
  const j = await status(env, mode, s);
  const st = j.status || 'UNKNOWN';
  await store.put(`tx:${txId}`, { ...s, status: st, ref: j.ref_id || s.ref || null });
  if (st === 'COMPLETE' && !s.reported && emit) {
    await emitPaid(emit, { integration: 'esewa', provider: 'eSewa', txId, amountPaisa: s.amount, ref: j.ref_id || s.uuid, livemode: mode !== 'test' });
    await store.put(`tx:${txId}`, { ...s, status: st, ref: j.ref_id || null, reported: true });
  }
  return { known: true, status: st };
}

export default {
  id: 'esewa',
  name: 'eSewa',
  category: 'payments',
  status: 'available',
  color: '#60BB46',
  description: 'eSewa checkout for a sale: the customer scans, pays with eSewa, and Stratek sees the payment.',
  docsUrl: 'https://developer.esewa.com.np/pages/Epay',
  test: { support: 'sandbox', note: 'Test merchant code EPAYTEST with the UAT secret from eSewa\'s developer docs; test eSewa IDs 9711111111-4, password Nepal@123, token 123456.' },
  secrets: [
    { name: 'ESEWA_MERCHANT_CODE', label: 'eSewa merchant (product) code', hint: 'Given by eSewa when your merchant account is set up for ePay (Test: EPAYTEST).' },
    { name: 'ESEWA_SECRET_KEY', label: 'eSewa secret key', hint: 'The ePay v2 secret key from eSewa (used to sign each payment).' },
  ],
  /** GET /pay/esewa/start/:mode/:token -- the page the QR opens: posts the signed form to eSewa. */
  async payPage({ token, env, mode, store, origin }) {
    const txId = token && (await store.get(`start:${token}`));
    const s = txId && (await store.get(`tx:${txId}`));
    if (!s || s.token !== token) return resultPage(false, 'This payment link has expired. Ask the shop for a new QR.');
    if (s.status === 'COMPLETE') return resultPage(true, 'This sale is already paid.');
    const f = {
      amount: rupees(s.amount), tax_amount: '0', total_amount: rupees(s.amount), transaction_uuid: s.uuid, product_code: env.ESEWA_MERCHANT_CODE,
      product_service_charge: '0', product_delivery_charge: '0',
      success_url: `${origin}/pay/esewa/return/${mode}`, failure_url: `${origin}/pay/esewa/return/${mode}?failed=1&u=${encodeURIComponent(s.uuid)}`,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
    };
    f.signature = await hmacB64(env.ESEWA_SECRET_KEY, signFields(f, f.signed_field_names));
    return gatewayFormPage({ title: 'Pay with eSewa', amountText: `Rs ${rupees(s.amount)}`, action: FORM[m(mode)], fields: f, buttonLabel: 'Continue to eSewa' });
  },
  /** GET /pay/esewa/return/:mode?data=<base64 JSON> -- check the signature, then the status API. */
  async payReturn({ url, env, mode, store, emit }) {
    if (url.searchParams.get('failed')) return resultPage(false);
    let d;
    try { d = JSON.parse(atob(url.searchParams.get('data') || '')); } catch { return resultPage(false); }
    const expected = await hmacB64(env.ESEWA_SECRET_KEY, signFields(d, String(d.signed_field_names || '')));
    if (!d.signature || expected !== d.signature) return resultPage(false, 'The payment result could not be verified.');
    const txId = await store.get(`uuid:${d.transaction_uuid}`);
    if (!txId) return resultPage(false, 'This payment is not from this shop.');
    const r = await checkAndReport({ env, mode, store, emit, txId });
    return r.status === 'COMPLETE' ? resultPage(true) : resultPage(false, r.status === 'PENDING' ? 'Your payment is still being processed. The shop will see it when eSewa confirms.' : undefined);
  },
  actions: [
    {
      id: 'test', label: 'Test eSewa', placement: ['settings'], fields: [],
      async run({ env, mode }) {
        const j = await status(env, mode, { amount: 1000, uuid: 'stratek-check' });
        return { type: 'message', title: 'eSewa answers', text: `eSewa's status service answered (${j.status || 'no status'}) for merchant code ${env.ESEWA_MERCHANT_CODE}. Make one small payment to confirm the secret key.` };
      },
    },
    {
      id: 'payment_link', label: 'Pay with eSewa', placement: ['charge'], fields: [],
      async run({ context, origin, store, mode }) {
        const tx = sale(context);
        requireNpr(tx, 'eSewa');
        const amount = paisa(tx.amount);
        const token = randomToken();
        const uuid = `stratek-${tx.id}-${Date.now().toString(36)}`;
        const old = await store.get(`tx:${tx.id}`);
        if (old?.token) await store.delete(`start:${old.token}`);
        await store.put(`tx:${tx.id}`, { token, uuid, amount, status: 'PENDING', createdAt: new Date().toISOString() });
        await store.put(`start:${token}`, tx.id);
        await store.put(`uuid:${uuid}`, tx.id);
        return { type: 'qr', title: `Pay with eSewa -- Rs ${rupees(amount)}`, text: `The customer scans this and pays with eSewa${mode === 'test' ? ' (TEST, eSewa UAT)' : ''}. Stratek sees the payment when they finish.`, qrPayload: `${origin}/pay/esewa/start/${mode}/${token}` };
      },
    },
    {
      id: 'check', label: 'Check eSewa payment', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode, emit }) {
        const tx = sale(context);
        const r = await checkAndReport({ env, mode, store, emit, txId: tx.id });
        if (!r.known) return { type: 'message', title: 'No eSewa payment', text: 'No eSewa payment was started for this sale.' };
        return { type: 'status', title: 'eSewa', status: r.status === 'COMPLETE' ? 'Paid' : r.status, text: r.status === 'COMPLETE' ? 'The customer has paid with eSewa. Now press Settle on this sale.' : 'Not paid yet.' };
      },
    },
  ],
};
