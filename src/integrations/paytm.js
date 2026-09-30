// paytm -- Paytm, UPI and cards for INR shops through Paytm Payment Links.
// Paytm for Business -> Developer settings -> API keys: your MID and merchant key
// (test MID/key under Test keys; production after Paytm activates your account).
//   API: https://securegw.paytm.in (test: https://securegw-stage.paytm.in)
//        POST /link/create, POST /link/fetchTransaction
//   Every request carries head.signature = Paytm checksum of the JSON body:
//   AES-128-CBC(key = merchant key, IV "@@@@&&&&####$$$$") of sha256hex(body + "|" + salt) + salt.
// Buttons: Test Paytm (Integrations tab); Pay with Paytm / UPI under the payment QR;
// Check Paytm payment on the sale. A paid link marks the sale "Paid online"; a person settles.

import { sale, sha256Hex } from './_util.js';
import { readJson } from './_ship.js';
import { randomToken } from './_nepal.js';

const base = (mode) => (mode === 'test' ? 'https://securegw-stage.paytm.in' : 'https://securegw.paytm.in');
const IV = new TextEncoder().encode('@@@@&&&&####$$$$');

/** Paytm checksum (their "generateSignature"). */
export async function paytmSignature(body, merchantKey) {
  const keyBytes = new TextEncoder().encode(String(merchantKey));
  if (![16, 24, 32].includes(keyBytes.length)) throw new Error('Paytm: the merchant key looks wrong (it should be 16 characters).');
  const salt = randomToken(2); // 4 characters
  const plain = `${await sha256Hex(`${body}|${salt}`)}${salt}`;
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['encrypt']);
  const enc = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv: IV }, key, new TextEncoder().encode(plain)));
  return btoa(String.fromCharCode(...enc));
}

async function pt(env, mode, path, bodyObj) {
  const body = JSON.stringify({ mid: String(env.PAYTM_MID).trim(), ...bodyObj });
  const signature = await paytmSignature(body, String(env.PAYTM_MERCHANT_KEY).trim());
  const res = await fetch(`${base(mode)}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: `{"head":${JSON.stringify({ tokenType: 'AES', signature, timestamp: String(Date.now()) })},"body":${body}}` });
  const j = await readJson(res);
  const info = j?.body?.resultInfo || {};
  if (!res.ok || (info.resultStatus && !/^(SUCCESS|S)$/.test(info.resultStatus))) throw new Error(`Paytm: ${info.resultMsg || info.resultMessage || `error ${res.status}`}`);
  return j.body;
}
const inrOnly = (tx) => { if (tx.currency !== 'INR') throw new Error('Paytm only takes payments in INR.'); };

export default {
  id: 'paytm',
  name: 'Paytm',
  category: 'payments',
  status: 'available',
  color: '#00BAF2',
  description: 'Paytm, UPI and cards for INR shops (Paytm Payment Links).',
  docsUrl: 'https://business.paytm.com/docs/api/create-link-api',
  test: { support: 'sandbox', note: 'Use your Paytm test (staging) MID and key; pay with Paytm\'s test wallet.' },
  secrets: [
    { name: 'PAYTM_MID', label: 'Paytm MID (merchant ID)', hint: 'Paytm for Business -> Developer settings -> API keys.' },
    { name: 'PAYTM_MERCHANT_KEY', label: 'Paytm merchant key', hint: '16 characters, from the same page.' },
  ],
  actions: [
    {
      id: 'test', label: 'Test Paytm', placement: ['settings'], fields: [],
      async run({ env, mode }) {
        const b = await pt(env, mode, '/link/fetch', { pageNo: 1, pageSize: 1 }).catch((e) => { if (/merchant|mid|checksum|signature/i.test(e.message)) throw e; return null; });
        return { type: 'message', title: 'Paytm is connected', text: `MID ${String(env.PAYTM_MID).trim()} accepted${mode === 'test' ? ' (staging)' : ''}${b ? '' : ' -- links will be checked when you use them'}.` };
      },
    },
    {
      id: 'payment_link', label: 'Pay with Paytm / UPI', placement: ['charge'], fields: [],
      async run({ env, context, store, mode, claims }) {
        const tx = sale(context); inrOnly(tx);
        const amount = Number(tx.amount).toFixed(2);
        const saved = await store.get(`tx:${tx.id}`);
        if (saved?.linkId && saved.amount === amount && !saved.paid) return { type: 'qr', title: `Pay INR ${amount}`, text: 'Customer scans this to pay with Paytm or any UPI app. Then use "Check Paytm payment" on the sale.', qrPayload: saved.url };
        const b = await pt(env, mode, '/link/create', { linkType: 'FIXED', linkName: `Sale${tx.id}`, linkDescription: `${claims?.owner_name || 'Shop'} sale ${tx.id}`.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 100), amount, maxPaymentsAllowed: 1, sendSms: false, sendEmail: false });
        const url = b.shortUrl || b.linkUrl;
        if (!/^https:\/\//.test(url || '')) throw new Error('Paytm did not return a payment link.');
        await store.put(`tx:${tx.id}`, { linkId: b.linkId, url, amount });
        return { type: 'qr', title: `Pay INR ${amount}`, text: `Customer scans this to pay with Paytm or any UPI app${mode === 'test' ? ' (TEST)' : ''}. Then use "Check Paytm payment" on the sale.`, qrPayload: url };
      },
    },
    {
      id: 'check', label: 'Check Paytm payment', placement: ['transaction'], fields: [],
      async run({ env, context, store, mode, emit }) {
        const tx = sale(context);
        const saved = await store.get(`tx:${tx.id}`);
        if (!saved?.linkId) return { type: 'message', title: 'No Paytm payment', text: 'No Paytm payment was started for this sale.' };
        const b = await pt(env, mode, '/link/fetchTransaction', { linkId: saved.linkId });
        const ok = (b.orders || []).find((o) => String(o.orderStatus).toUpperCase() === 'SUCCESS');
        if (!ok) return { type: 'status', title: 'Paytm', status: 'Waiting', text: 'Not paid yet.' };
        if (!saved.reported) {
          await emit({ id: `paytm-${ok.orderId || saved.linkId}`, type: 'payment.succeeded', data: { transactionId: String(tx.id), amount: Number(ok.txnAmount || saved.amount), currency: 'INR', provider: 'Paytm', integration: 'paytm', providerRef: String(ok.txnId || ok.orderId), method: ok.paymentMode || 'paytm', livemode: mode !== 'test' } });
        }
        await store.put(`tx:${tx.id}`, { ...saved, paid: true, reported: true, orderId: ok.orderId, txnId: ok.txnId });
        return { type: 'status', title: 'Paytm', status: 'Paid', text: 'The customer has paid. Now press Settle on this sale.' };
      },
    },
  ],
};
