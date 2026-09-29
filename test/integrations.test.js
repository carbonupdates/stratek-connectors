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
    if (u.pathname === '/v1/sessions/cs_1') return Response.json({ id: 'cs_1', status: 'success', paymentId: 'pay_1', amount: 115000, provider: 'khalti' });
    if (u.pathname === '/v1/refunds') return Response.json({ id: 'ref_1', status: 'succeeded', amount: body.amount }, { status: 201 });
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

test('PayBridgeNP: test, pay online QR, check, refund', async () => {
  const env = { PAYBRIDGE_SECRET_KEY: 'sk_test_good' }; const store = memStore();
  const t = await act(paybridge, 'test')({ env });
  assert.match(t.text, /TEST \(sandbox\)/);
  await assert.rejects(act(paybridge, 'test')({ env: { PAYBRIDGE_SECRET_KEY: 'bad' } }), /did not accept/);
  const q = await act(paybridge, 'payment_link')({ env, context: ctx, origin: 'https://c.workers.dev', store, claims: { aud: 'conn', owner_name: 'Chyau' } });
  assert.equal(q.type, 'qr'); assert.equal(q.qrPayload, 'https://checkout.paybridgenp.com/checkout/cs_1');
  const co = calls.find((c) => c.url.endsWith('/v1/checkout'));
  assert.equal(co.body.amount, 115000, 'rupees -> paisa'); assert.equal(co.body.returnUrl, 'https://c.workers.dev/paid'); assert.ok(co.headers['Idempotency-Key']);
  await assert.rejects(act(paybridge, 'payment_link')({ env, context: { transaction: { id: 1, amount: 5 } }, origin: 'x', store, claims: {} }), /at least Rs 10/);
  const c = await act(paybridge, 'check')({ env, context: ctx, store });
  assert.equal(c.status, 'Paid'); assert.match(c.text, /khalti/);
  const r = await act(paybridge, 'refund')({ env, context: ctx, store, fields: { amount: 100 } });
  assert.equal(r.status, 'succeeded'); assert.equal(calls.at(-1).body.amount, 10000); assert.equal(calls.at(-1).body.paymentId, 'pay_1');
  const none = await act(paybridge, 'check')({ env, context: { transaction: { id: 9 } }, store });
  assert.match(none.text, /No PayBridgeNP payment/);
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
  const order = calls.find((c) => c.url.endsWith('/aladdin/api/v1/orders'));
  assert.equal(order.body.store_id, 77); assert.equal(order.body.merchant_order_id, 'STK-42'); assert.equal(order.body.amount_to_collect, 1150); assert.equal(order.body.item_quantity, 2); assert.equal(order.body.recipient_phone, '9800000000');
  const again = await act(pathao, 'create_delivery')({ env, store, context: ctx, fields: { recipientName: 'Ram', recipientPhone: '1', recipientAddress: 'x', codAmount: 0 } });
  assert.equal(again.status, 'Already booked');
  const tr = await act(pathao, 'track')({ env, store, context: ctx });
  assert.equal(tr.status, 'Picked');
  assert.equal(calls.filter((c) => c.url.endsWith('/issue-token')).length, 1, 'token reused');
  await assert.rejects(act(pathao, 'test')({ env: { ...env, PATHAO_BASE_URL: 'http://x' }, store: memStore() }), /base URL/);
});
