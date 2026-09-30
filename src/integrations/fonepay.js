// fonepay -- Fonepay dynamic QR straight from Fonepay (no aggregator): a QR with the exact
// amount, which any Nepali bank / wallet app -- and UPI, Alipay+ and UnionPay apps -- can pay.
// Needs a Fonepay merchant agreement with API access: Fonepay (through your bank) gives the
// merchant code, the secret key and an API username / password (UAT ones for testing).
//   API: https://merchantapi.fonepay.com/api/merchant/merchantDetailsForThirdParty/
//        (test: https://uat-new-merchant-api.fonepay.com/...)
//        POST thirdPartyDynamicQrDownload  dataValidation = HMAC-SHA512 hex (secret key) of
//             "AMOUNT,PRN,MERCHANT-CODE,REMARKS1,REMARKS2"
//        POST thirdPartyDynamicQrGetStatus dataValidation of "PRN,MERCHANT-CODE"
// Buttons: Test Fonepay (Integrations tab); Fonepay QR for this amount (under the payment QR);
// Check Fonepay payment (sale details). A paid QR marks the sale "Paid online"; a person
// still presses Settle. (PayBridgeNP does the same through an aggregator, with notifications.)

import { sale } from './_util.js';
import { readJson } from './_ship.js';
import { requireNpr, randomToken } from './_nepal.js';

const base = (mode) => (mode === 'test' ? 'https://uat-new-merchant-api.fonepay.com' : 'https://merchantapi.fonepay.com');
const PATH = '/api/merchant/merchantDetailsForThirdParty';

async function hmac512(secret, text) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function fp(env, mode, op, body, message) {
  const payload = { ...body, merchantCode: String(env.FONEPAY_MERCHANT_CODE).trim(), dataValidation: await hmac512(String(env.FONEPAY_SECRET_KEY).trim(), message), username: String(env.FONEPAY_USERNAME).trim(), password: String(env.FONEPAY_PASSWORD) };
  const res = await fetch(`${base(mode)}${PATH}/${op}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
  const j = await readJson(res);
  if (res.status === 401 || res.status === 403) throw new Error('Fonepay did not accept the API username / password.');
  if (!res.ok || j?.success === false) throw new Error(`Fonepay: ${j?.message || j?.errorMessage || `error ${res.status}`}`);
  return j || {};
}

const clean = (s, n) => String(s || '').replace(/[^A-Za-z0-9 ._-]/g, '').slice(0, n) || 'Stratek';
const amountStr = (a) => { const n = Number(a); if (!(n > 0)) throw new Error('This sale has no amount to charge.'); return Number.isInteger(n) ? String(n) : n.toFixed(2); };

export default {
  id: 'fonepay',
  name: 'Fonepay dynamic QR',
  category: 'payments',
  status: 'available',
  color: '#E31E24',
  description: 'Fonepay QR with the exact amount, straight from Fonepay (your own merchant API access).',
  docsUrl: 'https://www.fonepay.com/',
  test: { support: 'sandbox', note: 'Fonepay gives UAT credentials for testing; UAT QRs are paid with Fonepay\'s test apps.' },
  secrets: [
    { name: 'FONEPAY_MERCHANT_CODE', label: 'Fonepay merchant code', hint: 'From Fonepay / your bank with the dynamic QR API agreement.' },
    { name: 'FONEPAY_SECRET_KEY', label: 'Fonepay secret key' },
    { name: 'FONEPAY_USERNAME', label: 'Fonepay API username' },
    { name: 'FONEPAY_PASSWORD', label: 'Fonepay API password' },
  ],
  actions: [
    {
      id: 'test', label: 'Test Fonepay', placement: ['settings'], fields: [],
      async run({ env, mode }) {
        const prn = `T${randomToken(8)}`;
        const r = await fp(env, mode, 'thirdPartyDynamicQrGetStatus', { prn }, `${prn},${String(env.FONEPAY_MERCHANT_CODE).trim()}`);
        return { type: 'message', title: 'Fonepay is connected', text: `Merchant ${String(env.FONEPAY_MERCHANT_CODE).trim()} accepted${mode === 'test' ? ' (UAT)' : ''}${r.paymentStatus ? ` (test lookup: ${r.paymentStatus})` : ''}.` };
      },
    },
    {
      id: 'dynamic_qr', label: 'Fonepay QR for this amount', placement: ['charge'], fields: [],
      async run({ env, context, store, mode, claims }) {
        const tx = sale(context); requireNpr(tx, 'Fonepay');
        const amount = amountStr(tx.amount);
        const saved = await store.get(`tx:${tx.id}`);
        if (saved?.qr && saved.amount === amount && !saved.paid) return { type: 'qr', title: `Fonepay -- Rs ${amount}`, text: 'Customer scans this with any bank or wallet app. Then use "Check Fonepay payment" on the sale.', qrPayload: saved.qr };
        const prn = `S${tx.id}-${randomToken(4)}`.slice(0, 25);
        const r1 = clean(claims?.owner_name || 'Stratek', 25); const r2 = clean(`Sale ${tx.id}`, 25);
        const code = String(env.FONEPAY_MERCHANT_CODE).trim();
        const r = await fp(env, mode, 'thirdPartyDynamicQrDownload', { amount, remarks1: r1, remarks2: r2, prn }, `${amount},${prn},${code},${r1},${r2}`);
        if (!r.qrMessage) throw new Error(`Fonepay did not return a QR${r.message ? ` (${r.message})` : ''}.`);
        await store.put(`tx:${tx.id}`, { prn, qr: r.qrMessage, amount });
        return { type: 'qr', title: `Fonepay -- Rs ${amount}`, text: `Customer scans this with any bank or wallet app${mode === 'test' ? ' (UAT)' : ''}. Then use "Check Fonepay payment" on the sale.`, qrPayload: r.qrMessage };
      },
    },
    {
      id: 'check', label: 'Check Fonepay payment', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode, emit }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved?.prn) return { type: 'message', title: 'No Fonepay QR', text: 'No Fonepay QR was made for this sale.' };
        const r = await fp(env, mode, 'thirdPartyDynamicQrGetStatus', { prn: saved.prn }, `${saved.prn},${String(env.FONEPAY_MERCHANT_CODE).trim()}`);
        const st = String(r.paymentStatus || '').toLowerCase();
        if (st !== 'success') return { type: 'status', title: 'Fonepay', status: st === 'failed' ? 'Failed' : 'Waiting', text: st === 'failed' ? 'The payment failed. Make a new QR.' : 'Not paid yet.' };
        if (!saved.reported) {
          await emit({ id: `fonepay-${r.fonepayTraceId || saved.prn}`, type: 'payment.succeeded', data: { transactionId: String(tx.id), amount: Number(saved.amount), currency: 'NPR', provider: 'Fonepay', integration: 'fonepay', providerRef: String(r.fonepayTraceId || saved.prn), method: 'fonepay', livemode: mode !== 'test' } });
        }
        await store.put(`tx:${tx.id}`, { ...saved, paid: true, reported: true, traceId: r.fonepayTraceId || null });
        return { type: 'status', title: 'Fonepay', status: 'Paid', text: 'The customer has paid. Now press Settle on this sale.' };
      },
    },
  ],
};
