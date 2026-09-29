// PayBridgeNP and Pathao against stand-in APIs (no real network).
import test from 'node:test';
import assert from 'node:assert/strict';
import paybridge from '../src/integrations/paybridgenp.js';
import pathao from '../src/integrations/pathao.js';

function memStore() { const m = new Map(); return { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, structuredClone(v)); }, _m: m }; }
const act = (i, id) => i.actions.find((a) => a.id === id).run;
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url); const body = init.body ? JSON.parse(init.body) : null;
  calls.push({ url: u.href, method: init.method || 'GET', headers: init.headers, body });
  if (u.host === 'api.paybridgenp.com') {
    if (init.headers.Authorization !== 'Bearer sk_test_good') return Response.json({ error: { message: 'Invalid key' } }, { status: 401 });
    if (u.pathname === '/v1/account') return Response.json({ merchant: { name: 'Chyau' }, project: { name: 'POS', mode: 'sandbox' } });
    if (u.pathname === '/v1/checkout') return Response.json({ id: 'cs_1', checkout_url: 'https://checkout.paybridgenp.com/checkout/cs_1', livemode: false }, { status: 201 });
    if (u.pathname === '/v1/sessions/cs_1' || u.pathname === '/v1/sessions/cs_q1') return Response.json({ id: 'cs_q1', status: 'success', paymentId: 'pay_q1', amount: 115000, currency: 'NPR', provider: 'fonepay', livemode: false });
    if (u.pathname === '/v1/webhooks' && (init.method || 'GET') === 'GET') return Response.json({ data: [{ id: 'wh_old', url: 'https://c.workers.dev/webhooks/paybridgenp' }, { id: 'wh_other', url: 'https://x.com' }] });
    if (u.pathname === '/v1/webhooks/wh_old' && init.method === 'DELETE') return Response.json({ deleted: true });
    if (u.pathname === '/v1/webhooks' && init.method === 'POST') return Response.json({ id: 'wh_new', url: body.url, signing_secret: 'whsec_1' }, { status: 201 });
    if (u.pathname === '/v1/refunds') return Response.json({ id: 'ref_1', status: 'succeeded', amount: body.amount }, { status: 201 });
    if (u.pathname === '/v1/qr/fonepay') return Response.json({ id: 'cs_q1', livemode: false, amount: body.amount, provider: 'fonepay', status: 'initiated', qr_message: '000201010212-FONEPAY-1' }, { status: 201 });
    if (u.pathname === '/v1/qr/cs_q1/refresh') return Response.json({ id: 'cs_q1', livemode: false, qr_message: '000201010212-FONEPAY-2' });
  }
  if (u.host === 'pathao.test') {
    if (u.pathname.endsWith('/issue-token')) return body.client_secret === 'sec' ? Response.json({ access_token: 'tok', expires_in: 3600 }) : Response.json({ message: 'Unauthorized' }, { status: 401 });
    if (init.headers.Authorization !== 'Bearer tok') return Response.json({ message: 'no token' }, { status: 401 });
    if (u.pathname.endsWith('/stores')) return Response.json({ data: { data: [{ store_id: 77, store_name: 'Chyau Lalitpur' }] } });
    if (u.pathname.endsWith('/orders') && init.method === 'POST') return Response.json({ data: { consignment_id: 'NP123', order_status: 'Pending', delivery_fee: 100 } });
    if (u.pathname.endsWith('/orders/NP123/info')) return Response.json({ data: { order_status: 'Picked', updated_at: '2026-09-29 12:00' } });
  }
  return new Response('not found', { status: 404 });
};

const ctx = { transaction: { id: 42, amount: 1150, currency: 'NPR', reference: 'T4', items: [{ name: 'Mushroom', qty: 2 }] } };

test('PayBridgeNP: till QR (create, refresh), webhook -> signed event, check, refund', async () => {
  const env = { PAYBRIDGE_SECRET_KEY: 'sk_test_good' }; const store = memStore();
  assert.match((await act(paybridge, 'test')({ env })).text, /TEST \(sandbox\)/);
  await assert.rejects(act(paybridge, 'test')({ env: { PAYBRIDGE_SECRET_KEY: 'bad' } }), /did not accept/);
  assert.equal(paybridge.qrProvider, true);
  assert.ok(!paybridge.actions.find((a) => a.id === 'payment_link'), 'link button removed');
  // Till QR
  const claims = { aud: 'conn', owner_name: 'Chyau', actor: 'bio@gmail.com' };
  const q1 = await act(paybridge, 'till_qr')({ env, context: ctx, store, claims });
  assert.equal(q1.qrPayload, '000201010212-FONEPAY-1'); assert.equal(q1.refreshAfterSec, 170);
  const fq = calls.find((c) => c.url.endsWith('/v1/qr/fonepay'));
  assert.equal(fq.body.amount, 115000); assert.equal(fq.body.customer.email, 'bio@gmail.com'); assert.equal(fq.body.metadata.stratek_transaction, '42');
  const q2 = await act(paybridge, 'till_qr')({ env, context: ctx, store, claims });
  assert.equal(q2.qrPayload, '000201010212-FONEPAY-2', 'same sale -> refresh');
  await assert.rejects(act(paybridge, 'till_qr')({ env, context: { transaction: { id: 1, amount: 5 } }, store, claims }), /at least Rs 10/);
  // Saving the key registers the webhook
  const notice = await paybridge.onKeysSaved({ env, store, origin: 'https://c.workers.dev' });
  assert.match(notice, /notifications/);
  assert.ok(calls.some((c) => c.method === 'DELETE' && c.url.endsWith('/v1/webhooks/wh_old')), 'old endpoint for this url replaced');
  const reg = calls.find((c) => c.method === 'POST' && c.url.endsWith('/v1/webhooks'));
  assert.equal(reg.body.url, 'https://c.workers.dev/webhooks/paybridgenp'); assert.ok(reg.body.events.includes('payment.succeeded'));
  // Webhook
  const emitted = [];
  const sign = async (t, body, secret = 'whsec_1') => {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`${t}.${body}`)))].map((b) => b.toString(16).padStart(2, '0')).join('');
  };
  const hook = async (bodyObj, { secret, t = Math.floor(Date.now() / 1000) } = {}) => {
    const raw = JSON.stringify(bodyObj);
    const request = new Request('https://c.workers.dev/webhooks/paybridgenp', { method: 'POST', headers: { 'X-PayBridgeNP-Signature': `t=${t},v1=${await sign(t, raw, secret)}` }, body: raw });
    return paybridge.webhook({ request, rawBody: raw, env, store, emit: async (e) => { emitted.push(e); } });
  };
  const evt = { type: 'payment.succeeded', data: { id: 'pay_q1', session_id: 'cs_q1', amount: 115000, currency: 'NPR', provider: 'fonepay' } };
  await assert.rejects(hook(evt, { secret: 'wrong' }), /Bad signature/);
  await assert.rejects(hook(evt, { t: Math.floor(Date.now() / 1000) - 3600 }), /timestamp/);
  const r = await hook(evt);
  assert.equal(r.forwarded, true);
  assert.equal(emitted[0].type, 'payment.succeeded'); assert.equal(emitted[0].data.transactionId, '42'); assert.equal(emitted[0].data.amount, 1150); assert.equal(emitted[0].data.providerRef, 'pay_q1');
  assert.equal((await hook({ type: 'payment.failed', data: { session_id: 'cs_q1' } })).ignored, 'payment.failed');
  assert.equal((await hook({ type: 'payment.succeeded', data: { session_id: 'cs_unknown' } })).ignored, 'unknown session');
  // Manual check + refund still work
  assert.equal((await act(paybridge, 'check')({ env, context: ctx, store })).status, 'Paid');
  const rf = await act(paybridge, 'refund')({ env, context: ctx, store, fields: { amount: 100 } });
  assert.equal(rf.status, 'succeeded');
});

test('Pathao: test lists stores, books a delivery, tracks it, token cached', async () => {
  const env = { PATHAO_BASE_URL: 'https://pathao.test/', PATHAO_CLIENT_ID: 'id', PATHAO_CLIENT_SECRET: 'sec', PATHAO_USERNAME: 'u@x.com', PATHAO_PASSWORD: 'p' };
  const store = memStore();
  const t = await act(pathao, 'test')({ env, store });
  assert.match(t.text, /Chyau Lalitpur \(ID 77\)/); assert.match(t.text, /store ID in Set up/);
  await assert.rejects(act(pathao, 'create_delivery')({ env, store, context: ctx, fields: {} }), /store ID/);
  env.PATHAO_STORE_ID = '77';
  const b = await act(pathao, 'create_delivery')({ env, store, context: ctx, fields: { recipientName: 'Ram', recipientPhone: '98-0000 0000', recipientAddress: 'Jhamsikhel', codAmount: 1150 } });
  assert.match(b.text, /NP123/);
  assert.ok(pathao.actions.find((a) => a.id === 'create_delivery').placement.includes('charge'), 'Pathao on the till too');
  const order = calls.find((c) => c.url.endsWith('/aladdin/api/v1/orders'));
  assert.equal(order.body.store_id, 77); assert.equal(order.body.merchant_order_id, 'STK-42'); assert.equal(order.body.amount_to_collect, 1150); assert.equal(order.body.item_quantity, 2); assert.equal(order.body.recipient_phone, '9800000000');
  const again = await act(pathao, 'create_delivery')({ env, store, context: ctx, fields: { recipientName: 'Ram', recipientPhone: '1', recipientAddress: 'x', codAmount: 0 } });
  assert.equal(again.status, 'Already booked');
  const tr = await act(pathao, 'track')({ env, store, context: ctx });
  assert.equal(tr.status, 'Picked');
  assert.equal(calls.filter((c) => c.url.endsWith('/issue-token')).length, 1, 'token reused');
  await assert.rejects(act(pathao, 'test')({ env: { ...env, PATHAO_BASE_URL: 'http://x' }, store: memStore() }), /base URL/);
});
