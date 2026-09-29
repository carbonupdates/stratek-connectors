// Stripe, PayPal, Coinbase, Slant 3D and Meta against stand-in APIs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify, createPublicKey } from 'node:crypto';
import stripe from '../src/integrations/stripe.js';
import paypal from '../src/integrations/paypal.js';
import coinbase from '../src/integrations/coinbase.js';
import slant3d from '../src/integrations/slant3d.js';
import metaCapi from '../src/integrations/meta_capi.js';
import metaCatalog from '../src/integrations/meta_catalog.js';

const memStore = () => { const m = new Map(); return { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, structuredClone(v)); } }; };
const act = (i, id) => i.actions.find((a) => a.id === id).run;
const calls = [];
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const jwk = privateKey.export({ format: 'jwk' });
const cbSecret = Buffer.concat([Buffer.from(jwk.d, 'base64url'), Buffer.from(jwk.x, 'base64url')]).toString('base64');

globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url); const h = init.headers || {};
  let body = init.body; try { body = JSON.parse(init.body); } catch {}
  calls.push({ u, method: init.method || 'GET', h, body });
  if (u.host === 'api.stripe.com') {
    if (h.Authorization !== 'Bearer sk_test_ok') return Response.json({ error: { message: 'bad' } }, { status: 401 });
    if (u.pathname === '/v1/account') return Response.json({ id: 'acct_1', country: 'US', default_currency: 'usd', business_profile: { name: 'Chyau' } });
    if (u.pathname === '/v1/checkout/sessions') return Response.json({ id: 'cs_1', url: 'https://checkout.stripe.com/c/cs_1', livemode: false });
    if (u.pathname === '/v1/checkout/sessions/cs_1') return Response.json({ id: 'cs_1', payment_status: 'paid', payment_intent: 'pi_1', status: 'complete' });
    if (u.pathname === '/v1/refunds') return Response.json({ id: 're_1', status: 'succeeded' });
  }
  if (u.host === 'api-m.sandbox.paypal.com') {
    if (u.pathname === '/v1/oauth2/token') return Response.json({ access_token: 'ppt', expires_in: 3000 });
    if (u.pathname === '/v2/checkout/orders' && init.method === 'POST') return Response.json({ id: 'O1', links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=O1' }] });
    if (u.pathname === '/v2/checkout/orders/O1') return Response.json({ id: 'O1', status: 'APPROVED' });
    if (u.pathname === '/v2/checkout/orders/O1/capture') return Response.json({ id: 'O1', status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ id: 'CAP1' }] } }] });
    if (u.pathname === '/v2/payments/captures/CAP1/refund') return Response.json({ id: 'R1', status: 'COMPLETED' });
  }
  if (u.host === 'business.coinbase.com') {
    const tok = String(h.Authorization || '').slice(7).split('.');
    const ok = verify(null, Buffer.from(`${tok[0]}.${tok[1]}`), publicKey, Buffer.from(tok[2], 'base64url'));
    const claims = JSON.parse(Buffer.from(tok[1], 'base64url'));
    if (!ok || claims.sub !== 'keyname' || claims.uris[0] !== `${init.method} business.coinbase.com${u.pathname}`) return Response.json({ message: 'unauthorized' }, { status: 401 });
    if (u.pathname === '/api/v1/checkouts' && init.method === 'POST') return Response.json({ id: 'chk_1', url: 'https://pay.coinbase.com/chk_1', amount: body.amount, currency: body.currency, status: 'ACTIVE' });
    if (u.pathname === '/api/v1/checkouts') return Response.json({ checkouts: [] });
    if (u.pathname === '/api/v1/checkouts/chk_1') return Response.json({ id: 'chk_1', status: 'COMPLETED', transactionHash: '0xabcdef1234567890' });
  }
  if (u.host === 'slant3dapi.com') {
    if (h.Authorization !== 'Bearer sl-ok') return Response.json({ message: 'no' }, { status: 401 });
    if (u.pathname === '/v2/api/platforms') return Response.json({ data: [{ publicId: 'plat1', name: 'Chyau prints' }] });
    if (u.pathname === '/v2/api/filaments') return Response.json({ data: [{ publicId: 'f1', available: true }, { publicId: 'f2', available: false }] });
    if (u.pathname === '/v2/api/files/direct-upload') return Response.json({ presignedUrl: 'https://s3.test/put', filePlaceholder: { name: body.name } });
    if (u.pathname === '/v2/api/files/confirm-upload') return Response.json({ data: { publicFileServiceId: 'file1' } });
    if (u.pathname === '/v2/api/orders' && init.method === 'POST') return Response.json({ order: { publicId: 'SLANT_1', totals: { total: 12.5, currency: 'USD' } } });
    if (u.pathname === '/v2/api/orders/SLANT_1' && init.method === 'POST') return Response.json({ order: { status: 'PROCESSING', totals: { total: 12.5, currency: 'USD' } } });
    if (u.pathname === '/v2/api/orders/SLANT_1') return Response.json({ order: { status: 'SHIPPED', trackingNumber: '1Z999' } });
  }
  if (u.host === 'files.test') return new Response(new Uint8Array([1, 2, 3]));
  if (u.host === 's3.test') return new Response('', { status: 200 });
  if (u.host === 'graph.facebook.com') {
    if (u.searchParams.get('access_token') !== 'mt') return Response.json({ error: { message: 'Invalid OAuth access token' } }, { status: 400 });
    if (u.pathname === '/v23.0/px1' ) return Response.json({ id: 'px1', name: 'Chyau dataset' });
    if (u.pathname === '/v23.0/px1/events') return Response.json({ events_received: 1 });
    if (u.pathname === '/v23.0/cat1') return Response.json({ name: 'Chyau shop', product_count: 3 });
    if (u.pathname === '/v23.0/cat1/batch') return Response.json({ handles: ['h1'] });
  }
  return new Response('not found ' + u.href, { status: 404 });
};
const last = (host) => calls.filter((c) => c.u.host === host).at(-1);
const ctxUSD = { transaction: { id: 7, amount: 25.5, currency: 'USD', items: [{ name: 'Kit', qty: 1, price: 25.5 }], createdAt: '2026-09-29T10:00:00Z' } };

test('Stripe: test, checkout QR (cents, form-encoded), check, refund', async () => {
  const env = { STRIPE_SECRET_KEY: 'sk_test_ok' }; const store = memStore();
  assert.match((await act(stripe, 'test')({ env })).text, /Chyau.*TEST/);
  const q = await act(stripe, 'payment_link')({ env, context: ctxUSD, origin: 'https://c.dev', store, claims: { aud: 'a', owner_name: 'Chyau' } });
  assert.equal(q.qrPayload, 'https://checkout.stripe.com/c/cs_1');
  const p = new URLSearchParams(last('api.stripe.com').body);
  assert.equal(p.get('line_items[0][price_data][unit_amount]'), '2550'); assert.equal(p.get('line_items[0][price_data][currency]'), 'usd'); assert.equal(p.get('mode'), 'payment');
  assert.equal((await act(stripe, 'check')({ env, context: ctxUSD, store })).status, 'Paid');
  assert.equal((await act(stripe, 'refund')({ env, context: ctxUSD, store, fields: {} })).status, 'succeeded');
  assert.equal(new URLSearchParams(last('api.stripe.com').body).get('payment_intent'), 'pi_1');
  await assert.rejects(act(stripe, 'test')({ env: { STRIPE_SECRET_KEY: 'x' } }), /did not accept/);
});

test('PayPal: sandbox, currency check, order QR, capture on check, refund', async () => {
  const env = { PAYPAL_CLIENT_ID: 'id', PAYPAL_CLIENT_SECRET: 's', STRATEK_MODE: 'test' }; const store = memStore();
  assert.match((await act(paypal, 'test')({ env, store })).text, /SANDBOX/);
  await assert.rejects(act(paypal, 'payment_link')({ env, context: { transaction: { id: 1, amount: 10, currency: 'NPR' } }, origin: 'x', store, claims: {} }), /does not accept NPR/);
  const q = await act(paypal, 'payment_link')({ env, context: ctxUSD, origin: 'https://c.dev', store, claims: { aud: 'a' } });
  assert.match(q.qrPayload, /sandbox\.paypal\.com/);
  assert.equal(calls.find((c) => c.u.pathname === '/v2/checkout/orders' && c.method === 'POST').body.purchase_units[0].amount.value, '25.50');
  assert.equal((await act(paypal, 'check')({ env, context: ctxUSD, store })).status, 'Paid');
  assert.equal((await act(paypal, 'refund')({ env, context: ctxUSD, store, fields: { amount: 5 } })).status, 'COMPLETED');
  assert.equal(last('api-m.sandbox.paypal.com').body.amount.value, '5.00');
});

test('Coinbase: Ed25519 JWT per request, checkout QR, check', async () => {
  const env = { COINBASE_API_KEY_NAME: 'keyname', COINBASE_API_PRIVATE_KEY: cbSecret }; const store = memStore();
  assert.match((await act(coinbase, 'test')({ env })).text, /accepted/);
  const q = await act(coinbase, 'payment_link')({ env, context: ctxUSD, origin: 'https://c.dev', store, claims: { owner_name: 'Chyau' } });
  assert.equal(q.qrPayload, 'https://pay.coinbase.com/chk_1'); assert.equal(last('business.coinbase.com').body.amount, '25.50');
  const c = await act(coinbase, 'check')({ env, context: ctxUSD, store });
  assert.equal(c.status, 'Paid');
  await assert.rejects(act(coinbase, 'test')({ env: { ...env, COINBASE_API_PRIVATE_KEY: Buffer.from('short').toString('base64') } }), /Ed25519/);
});

test('Slant 3D: test, quote (upload + draft), confirm, track', async () => {
  const env = { SLANT3D_API_KEY: 'sl-ok' }; const store = memStore();
  assert.match((await act(slant3d, 'test')({ env })).text, /Chyau prints \(plat1\).*1 filaments/);
  const fields = { fileUrl: 'https://files.test/part.stl', quantity: 2, email: 'a@b.com', name: 'A', line1: '1 St', city: 'X', zip: '1', country: 'us' };
  const q = await act(slant3d, 'quote')({ env, context: ctxUSD, store, fields });
  assert.match(q.text, /SLANT_1: USD 12.5/);
  const order = calls.find((c) => c.u.pathname === '/v2/api/orders' && c.method === 'POST').body;
  assert.equal(order.platformId, 'plat1'); assert.equal(order.items[0].publicFileServiceId, 'file1'); assert.equal(order.items[0].quantity, 2); assert.equal(order.customer.details.address.country, 'US');
  assert.equal((await act(slant3d, 'confirm')({ env, context: ctxUSD, store })).status, 'PROCESSING');
  assert.match((await act(slant3d, 'track')({ env, context: ctxUSD, store })).text, /1Z999/);
});

test('Meta: Conversions API purchase (hashed), catalogue sync from menu', async () => {
  const env = { META_PIXEL_ID: 'px1', META_CAPI_TOKEN: 'mt' }; const store = memStore();
  assert.match((await act(metaCapi, 'test')({ env })).text, /Chyau dataset/);
  await assert.rejects(act(metaCapi, 'send_purchase')({ env, context: ctxUSD, store, fields: {} }), /email or phone/);
  await act(metaCapi, 'send_purchase')({ env, context: ctxUSD, store, fields: { email: ' A@B.com ' } });
  const ev = last('graph.facebook.com').body.data[0];
  assert.equal(ev.event_name, 'Purchase'); assert.equal(ev.event_id, 'stratek-7'); assert.equal(ev.user_data.em[0].length, 64); assert.ok(!JSON.stringify(ev).includes('a@b.com'));
  assert.equal(ev.custom_data.value, 25.5);
  const cenv = { META_CATALOG_ID: 'cat1', META_SYSTEM_USER_TOKEN: 'mt' };
  assert.match((await act(metaCatalog, 'test')({ env: cenv })).text, /3 products/);
  await assert.rejects(act(metaCatalog, 'sync_menu')({ env: cenv, context: {}, claims: {} }), /menu/);
  const menu = { currency: 'NPR', items: [{ id: 1, name: 'Oyster', price: 250, photo: 'https://s.com/m/1.jpg', available: true }, { id: 2, name: 'No photo', price: 10 }, { id: 3, name: 'Shiitake', price: 400, photo: 'https://s.com/m/3.jpg', available: false }] };
  const r = await act(metaCatalog, 'sync_menu')({ env: cenv, context: { menu }, claims: { iss: 'https://strateknepal.com' } });
  assert.match(r.text, /2 product\(s\) sent; 1 skipped/);
  const reqs = last('graph.facebook.com').body.requests;
  assert.equal(reqs[0].data.price, 25000); assert.equal(reqs[0].retailer_id, 'stratek-1'); assert.equal(reqs[1].data.availability, 'out of stock');
});
