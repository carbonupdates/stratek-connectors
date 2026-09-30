// connectips -- pay a sale from any Nepali bank account through NCHL connectIPS.
// The QR opens a short page on this connector that posts the signed form to connectIPS;
// after the customer pays, connectIPS sends them to the success/failure URL registered with
// NCHL (give NCHL: <connector>/pay/connectips/return/live -- /test for UAT). The connector then
// asks connectIPS (validatetxn) and tells Stratek (signed "payment.succeeded"; a person settles).
//   Login page:  <base>/connectipswebgw/loginpage          (form POST)
//   Validate:    <base>/connectipswebws/api/creditor/validatetxn  (basic auth APPID:password)
//   Token: base64( SHA256withRSA( "MERCHANTID=..,APPID=..,APPNAME=..,TXNID=..,TXNDATE=..,TXNCRNCY=NPR,
//          TXNAMT=..,REFERENCEID=..,REMARKS=..,PARTICULARS=..,TOKEN=TOKEN" ) ) with your CREDITOR key.
//   Docs: https://doc.connectips.com/docs/connectIPS-Gateway/merchant-interface
// Buttons: Test connectIPS (Integrations tab); Pay with connectIPS (under the payment QR);
// Check connectIPS payment (sale details). Refunds: through NCHL / your bank.

import { sale } from './_util.js';
import { paisa, rupees, requireNpr, randomToken, gatewayFormPage, resultPage, emitPaid } from './_nepal.js';

const DEFAULT_BASE = { live: 'https://login.connectips.com', test: 'https://uat.connectips.com' };
const base = (env, mode) => String(env.CONNECTIPS_BASE_URL || DEFAULT_BASE[mode === 'test' ? 'test' : 'live']).replace(/\/+$/, '');

// ── RSA key (PEM, PKCS#8 "BEGIN PRIVATE KEY" or PKCS#1 "BEGIN RSA PRIVATE KEY") ──
function derLen(n) { if (n < 128) return [n]; const b = []; while (n > 0) { b.unshift(n & 255); n >>= 8; } return [0x80 | b.length, ...b]; }
function pkcs1ToPkcs8(pkcs1) {
  const algo = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  const octet = [0x04, ...derLen(pkcs1.length), ...pkcs1];
  const body = [0x02, 0x01, 0x00, ...algo, ...octet];
  return new Uint8Array([0x30, ...derLen(body.length), ...body]);
}
export async function rsaKey(pem) {
  const s = String(pem || '');
  const isPkcs1 = /BEGIN RSA PRIVATE KEY/.test(s);
  if (!/PRIVATE KEY/.test(s)) throw new Error('connectIPS: paste your private key in PEM format (-----BEGIN PRIVATE KEY----- ...). Convert CREDITOR.pfx with: openssl pkcs12 -in CREDITOR.pfx -nocerts -nodes');
  const b64 = s.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  let der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  if (isPkcs1) der = pkcs1ToPkcs8([...der]);
  try { return await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']); }
  catch { throw new Error('connectIPS: that private key could not be read. Export it again from CREDITOR.pfx (unencrypted PEM).'); }
}
async function token(env, text) {
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await rsaKey(env.CONNECTIPS_PRIVATE_KEY), new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function validate(env, mode, s) {
  const msg = `MERCHANTID=${env.CONNECTIPS_MERCHANT_ID},APPID=${env.CONNECTIPS_APP_ID},REFERENCEID=${s.txnId},TXNAMT=${s.amount}`;
  const res = await fetch(`${base(env, mode)}/connectipswebws/api/creditor/validatetxn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${btoa(`${env.CONNECTIPS_APP_ID}:${env.CONNECTIPS_PASSWORD}`)}` },
    body: JSON.stringify({ merchantId: Number(env.CONNECTIPS_MERCHANT_ID), appId: env.CONNECTIPS_APP_ID, referenceId: s.txnId, txnAmt: String(s.amount), token: await token(env, msg) }),
  });
  const j = await res.json().catch(() => null);
  if (res.status === 401) throw new Error('connectIPS did not accept the App ID / password.');
  if (!res.ok && !j) throw new Error(`connectIPS answered ${res.status}.`);
  return j || {};
}

async function checkAndReport({ env, mode, store, emit, txId }) {
  const s = await store.get(`tx:${txId}`);
  if (!s) return { known: false };
  const j = await validate(env, mode, s);
  const ok = String(j.status || '').toUpperCase() === 'SUCCESS';
  await store.put(`tx:${txId}`, { ...s, status: ok ? 'SUCCESS' : (j.status || 'PENDING'), statusDesc: j.statusDesc || null });
  if (ok && !s.reported && emit) {
    await emitPaid(emit, { integration: 'connectips', provider: 'connectIPS', txId, amountPaisa: s.amount, ref: s.txnId, livemode: mode !== 'test' });
    await store.put(`tx:${txId}`, { ...s, status: 'SUCCESS', statusDesc: j.statusDesc || null, reported: true });
  }
  return { known: true, ok, status: j.status || 'PENDING', desc: j.statusDesc || '' };
}

const nepalDate = () => { const d = new Date(Date.now() + 345 * 60000); return `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`; };

export default {
  id: 'connectips',
  name: 'connectIPS',
  category: 'payments',
  status: 'available',
  color: '#0C4DA2',
  description: 'Pay a sale from any Nepali bank account with connectIPS; Stratek sees the payment.',
  docsUrl: 'https://doc.connectips.com/docs/connectIPS-Gateway/merchant-interface',
  test: { support: 'sandbox', note: 'NCHL gives UAT credentials and a UAT certificate for testing (uat.connectips.com).' },
  secrets: [
    { name: 'CONNECTIPS_MERCHANT_ID', label: 'Merchant ID', hint: 'From NCHL when your connectIPS e-payment is approved.' },
    { name: 'CONNECTIPS_APP_ID', label: 'App ID' },
    { name: 'CONNECTIPS_APP_NAME', label: 'App name' },
    { name: 'CONNECTIPS_PASSWORD', label: 'App password', hint: 'Used to check payments (validatetxn).' },
    { name: 'CONNECTIPS_PRIVATE_KEY', label: 'Private key (PEM)', hint: 'From your CREDITOR.pfx: openssl pkcs12 -in CREDITOR.pfx -nocerts -nodes -- paste the PRIVATE KEY block (BEGIN/END lines included).' },
    { name: 'CONNECTIPS_BASE_URL', label: 'connectIPS address', hint: 'Optional. Leave empty for https://login.connectips.com (Live) / https://uat.connectips.com (Test), or paste the address NCHL gave you.', optional: true },
  ],
  async payPage({ token: t, env, mode, store }) {
    const txId = t && (await store.get(`start:${t}`));
    const s = txId && (await store.get(`tx:${txId}`));
    if (!s || s.token !== t) return resultPage(false, 'This payment link has expired. Ask the shop for a new QR.');
    if (s.status === 'SUCCESS') return resultPage(true, 'This sale is already paid.');
    const f = {
      MERCHANTID: env.CONNECTIPS_MERCHANT_ID, APPID: env.CONNECTIPS_APP_ID, APPNAME: env.CONNECTIPS_APP_NAME, TXNID: s.txnId, TXNDATE: s.txnDate,
      TXNCRNCY: 'NPR', TXNAMT: String(s.amount), REFERENCEID: s.ref, REMARKS: s.remarks, PARTICULARS: s.particulars,
    };
    f.TOKEN = await token(env, `${Object.entries(f).map(([k, v]) => `${k}=${v}`).join(',')},TOKEN=TOKEN`);
    return gatewayFormPage({ title: 'Pay with connectIPS', amountText: `Rs ${rupees(s.amount)}`, action: `${base(env, mode)}/connectipswebgw/loginpage`, fields: f, buttonLabel: 'Continue to connectIPS' });
  },
  async payReturn({ url, form, env, mode, store, emit }) {
    const txnId = url.searchParams.get('TXNID') || form.TXNID;
    const txId = txnId && (await store.get(`txn:${txnId}`));
    if (!txId) return resultPage(false);
    const r = await checkAndReport({ env, mode, store, emit, txId });
    return r.ok ? resultPage(true) : resultPage(false, r.desc || undefined);
  },
  actions: [
    {
      id: 'test', label: 'Test connectIPS', placement: ['settings'], fields: [],
      async run({ env, origin, mode }) {
        await rsaKey(env.CONNECTIPS_PRIVATE_KEY);
        return { type: 'message', title: 'connectIPS keys look right', text: `The private key reads fine. Give NCHL this success and failure URL: ${origin}/pay/connectips/return/${mode}. Then make one small payment to confirm.` };
      },
    },
    {
      id: 'payment_link', label: 'Pay with connectIPS', placement: ['charge'], fields: [],
      async run({ env, context, origin, store, mode, claims }) {
        const tx = sale(context);
        requireNpr(tx, 'connectIPS');
        await rsaKey(env.CONNECTIPS_PRIVATE_KEY); // fail early, at the till, if the key is wrong
        const amount = paisa(tx.amount);
        const t = randomToken();
        const txnId = `S${tx.id}T${Date.now().toString(36)}`.slice(0, 20);
        const old = await store.get(`tx:${tx.id}`);
        if (old?.token) await store.delete(`start:${old.token}`);
        await store.put(`tx:${tx.id}`, { token: t, txnId, amount, txnDate: nepalDate(), ref: `sale-${tx.id}`.slice(0, 20), remarks: `Sale #${tx.id}`.slice(0, 50), particulars: `${claims?.owner_name || 'Shop'} sale #${tx.id}`.slice(0, 100), status: 'PENDING', createdAt: new Date().toISOString() });
        await store.put(`start:${t}`, tx.id);
        await store.put(`txn:${txnId}`, tx.id);
        return { type: 'qr', title: `Pay with connectIPS -- Rs ${rupees(amount)}`, text: `The customer scans this and pays from their bank account${mode === 'test' ? ' (TEST, UAT)' : ''}. Stratek sees the payment when they finish.`, qrPayload: `${origin}/pay/connectips/start/${mode}/${t}` };
      },
    },
    {
      id: 'check', label: 'Check connectIPS payment', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode, emit }) {
        const tx = sale(context);
        const r = await checkAndReport({ env, mode, store, emit, txId: tx.id });
        if (!r.known) return { type: 'message', title: 'No connectIPS payment', text: 'No connectIPS payment was started for this sale.' };
        return { type: 'status', title: 'connectIPS', status: r.ok ? 'Paid' : r.status, text: r.ok ? 'The customer has paid with connectIPS. Now press Settle on this sale.' : (r.desc || 'Not paid yet.') };
      },
    },
  ],
};
