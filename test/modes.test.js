// v0.8.0: test vs live keys, migration of old test keys, Pathao locations + quote.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createHash } from 'node:crypto';
import worker, { ConnectorState } from '../src/index.js';

const STRATEK = 'https://strateknepal.com';
const SELF = 'https://stratek-connector.test.workers.dev';
const b64url = (b) => Buffer.from(b).toString('base64url');

function makeEnv(extra = {}) {
  const map = new Map();
  const inst = new ConnectorState({ storage: { get: async (k) => map.get(k), put: async (k, v) => { map.set(k, structuredClone(v)); }, delete: async (k) => { map.delete(k); } } });
  return { STRATEK_URL: STRATEK, STATE: { idFromName: () => 'config', get: () => ({ fetch: (u, i) => inst.fetch(new Request(u, i)) }) }, _map: map, ...extra };
}

const { privateKey } = generateKeyPairSync('ed25519');
const jwk = privateKey.export({ format: 'jwk' });
const kid = b64url(createHash('sha256').update(jwk.x).digest()).slice(0, 16);
const subtleKey = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', d: jwk.d, x: jwk.x }, { name: 'Ed25519' }, false, ['sign']);
async function pass(claims) {
  const h = b64url(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid })); const p = b64url(JSON.stringify(claims));
  const sig = await crypto.subtle.sign({ name: 'Ed25519' }, subtleKey, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64url(sig)}`;
}

// Stand-in for Stratek's two endpoints the connector calls.
globalThis.fetch = async (input, init) => {
  const req = input instanceof Request ? input : new Request(input, init);
  const u = new URL(req.url);
  if (u.href === `${STRATEK}/api/v1/connectors/public-key`) return Response.json({ success: true, data: { issuer: STRATEK, kid, alg: 'EdDSA', jwk: { kty: 'OKP', crv: 'Ed25519', x: jwk.x } } });
  if (u.href === `${STRATEK}/api/v1/connectors/claim`) {
    const body = await req.json();
    if (body.code !== 'a'.repeat(64) || body.url !== SELF) return Response.json({ success: false, error: { message: 'bad code' } }, { status: 400 });
    return Response.json({ success: true, data: { connectorId: 'conn-1', ownerType: 'merchant', ownerId: '1', ownerName: 'Chyau', issuer: STRATEK } });
  }
  return new Response('not found', { status: 404 });
};
const go = (env, path, init) => worker.fetch(new Request(SELF + path, { redirect: 'manual', ...init }), env);

// Provider stand-ins (added in front of the Stratek stand-in above)
const stratekFetch = globalThis.fetch;
const seen = [];
const pbHooks = [];
const stratekEvents = [];
const tgCalls = [];
const kCalls = []; const kState = { status: 'Initiated' }; const eCalls = []; const eState = { status: 'PENDING' }; const cCalls = []; const irdCalls = [];
const waCalls = []; const viCalls = []; const wooCalls = []; const shCalls = []; const oaCalls = []; const qbCalls = []; const xeCalls = []; const zoCalls = []; const dhCalls = [];
const hookCalls = []; const smsCalls = []; const gCalls = []; const gTabs = ['Sheet1']; const mcCalls = []; const hsCalls = [];
globalThis.fetch = async (input, init) => {
  const req = input instanceof Request ? input : new Request(input, init);
  const u = new URL(req.url);
  const body = ['GET', 'DELETE'].includes(req.method) ? null : await req.clone().json().catch(() => null);
  seen.push({ host: u.host, path: u.pathname, auth: req.headers.get('Authorization'), body });
  if (u.host === 'api.paybridgenp.com') {
    const key = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    if (u.pathname === '/v1/account') return Response.json({ merchant: { name: 'Chyau' }, project: { mode: key.startsWith('sk_test_') ? 'sandbox' : 'live' } });
    if (u.pathname === '/v1/webhooks' && req.method === 'GET') return Response.json({ data: pbHooks });
    if (u.pathname === '/v1/webhooks' && req.method === 'POST') { const h = { id: 'wh' + (pbHooks.length + 1), url: body.url }; pbHooks.push(h); return Response.json({ ...h, signing_secret: 'whsec_' + h.id }, { status: 201 }); }
    if (u.pathname.startsWith('/v1/webhooks/')) return Response.json({ deleted: true });
  }
  if (u.host === 'pathao-sandbox.test' || u.host === 'pathao.test') {
    if (u.pathname.endsWith('/issue-token')) return Response.json({ access_token: 'tok-' + u.host, expires_in: 3600 });
    if (u.pathname.endsWith('/stores')) return Response.json({ data: { data: [{ store_id: 7, store_name: 'Chyau' }] } });
    if (u.pathname.endsWith('/city-list')) return Response.json({ data: { data: [{ city_id: 1, city_name: 'Kathmandu' }, { city_id: 2, city_name: 'Lalitpur' }] } });
    if (u.pathname.endsWith('/cities/1/zone-list')) return Response.json({ data: { data: [{ zone_id: 11, zone_name: 'Baneshwor' }] } });
    if (u.pathname.endsWith('/zones/11/area-list')) return Response.json({ data: { data: [{ area_id: 111, area_name: 'Naya Baneshwor', home_delivery_available: true }] } });
    if (u.pathname.endsWith('/merchant/price-plan')) return Response.json({ data: { price: 120, discount: 0, final_price: 110 } });
    if (u.pathname.endsWith('/orders')) return Response.json({ data: { consignment_id: 'NP9', order_status: 'Pending' } });
  }
  if (u.host === 'graph.facebook.com' && u.pathname.includes('/PHONE1')) {
    waCalls.push({ path: u.pathname, body, auth: req.headers.get('Authorization') });
    if (req.method === 'GET') return Response.json({ display_phone_number: '+977 980-0000000', verified_name: 'Chyau Bio', quality_rating: 'GREEN' });
    if (body.template.name === 'missing') return Response.json({ error: { code: 132001, message: 'Template name does not exist' } }, { status: 404 });
    return Response.json({ messages: [{ id: 'wamid.1', message_status: 'accepted' }] });
  }
  if (u.host === 'graph.facebook.com') return Response.json({ events_received: 1 });
  if (u.host === 'chatapi.viber.com') { viCalls.push({ path: u.pathname, body, token: req.headers.get('X-Viber-Auth-Token') }); return Response.json(u.pathname.endsWith('get_account_info') ? { status: 0, uri: 'chyaubot', name: 'Chyau Bot' } : { status: 0, message_token: 1 }); }
  if (u.host === 'shop.example.com') { wooCalls.push({ method: req.method, path: u.pathname + u.search, body, auth: req.headers.get('Authorization') }); if (req.method === 'GET' && u.pathname.endsWith('/orders')) return Response.json([{ number: '101', status: 'processing', currency: 'NPR', total: '500.00', billing: { first_name: 'Ram' } }]); if (req.method === 'GET') return Response.json([]); return Response.json({ id: 900 + wooCalls.length }); }
  if (u.host === 'chyau.myshopify.com') { shCalls.push({ method: req.method, path: u.pathname, body, token: req.headers.get('X-Shopify-Access-Token') }); if (u.pathname.endsWith('/shop.json')) return Response.json({ shop: { name: 'Chyau', currency: 'NPR' } }); if (u.pathname.endsWith('/orders.json')) return Response.json({ orders: [{ name: '#1001', financial_status: 'paid', currency: 'NPR', total_price: '750.00' }] }); if (req.method === 'POST') return Response.json({ product: { id: 5000 + shCalls.length, variants: [{ id: 1, price: body.product.variants[0].price }] } }); return Response.json({ product: { id: 1, variants: [{ id: 77, price: '1.00' }] } }); }
  if (u.host === 'oauth.platform.intuit.com' || u.host === 'identity.xero.com' || u.host === 'accounts.zoho.com') { const f = Object.fromEntries(new URLSearchParams(await req.clone().text())); oaCalls.push({ host: u.host, form: f, auth: req.headers.get('Authorization') }); return Response.json({ access_token: `at-${u.host}-${f.grant_type}`, refresh_token: 'rt-1', expires_in: f.grant_type === 'authorization_code' ? 1 : 3600 }); }
  if (u.host === 'sandbox-quickbooks.api.intuit.com') { qbCalls.push({ method: req.method, path: u.pathname + u.search, body, auth: req.headers.get('Authorization') }); if (u.pathname.includes('/query')) { const q = u.searchParams.get('query'); return Response.json({ QueryResponse: q.includes('from Item') ? {} : { Account: [{ Id: '79' }] } }); } if (u.pathname.endsWith('/item')) return Response.json({ Item: { Id: '33' } }); if (u.pathname.includes('/companyinfo/')) return Response.json({ CompanyInfo: { CompanyName: 'Sandbox Co' } }); return Response.json({ SalesReceipt: { Id: '145', DocNumber: '1037' } }); }
  if (u.host === 'api.xero.com') { xeCalls.push({ method: req.method, path: u.pathname, body, tenant: req.headers.get('xero-tenant-id') }); if (u.pathname === '/connections') return Response.json([{ tenantId: 'T-1', tenantType: 'ORGANISATION', tenantName: 'Demo Company' }]); if (u.pathname.endsWith('/Organisation')) return Response.json({ Organisations: [{ Name: 'Demo Company (Global)', BaseCurrency: 'USD' }] }); return Response.json({ Invoices: [{ InvoiceID: 'inv-1', InvoiceNumber: 'INV-0042' }] }); }
  if (u.host === 'www.zohoapis.com') { zoCalls.push({ method: req.method, path: u.pathname + u.search, body }); if (u.pathname.endsWith('/organizations')) return Response.json({ code: 0, organizations: [{ organization_id: 'O1', name: 'Chyau Pvt', currency_code: 'NPR', is_default_org: true }] }); if (u.pathname.endsWith('/contacts') && req.method === 'GET') return Response.json({ code: 0, contacts: [] }); if (u.pathname.endsWith('/contacts')) return Response.json({ code: 0, contact: { contact_id: 'C9' } }); return Response.json({ code: 0, invoice: { invoice_id: 'I1', invoice_number: 'INV-000001' } }); }
  if (u.host === 'express.api.dhl.com') { dhCalls.push({ method: req.method, path: u.pathname + u.search, body, auth: req.headers.get('Authorization') }); if (u.pathname.endsWith('/rates')) return Response.json({ products: [{ productName: 'EXPRESS WORLDWIDE', totalPrice: [{ currencyType: 'BILLC', priceCurrency: 'NPR', price: 7420 }], deliveryCapabilities: { estimatedDeliveryDateAndTime: '2026-10-04T23:59:00' } }] }); if (u.pathname.endsWith('/shipments')) return Response.json({ shipmentTrackingNumber: '1234567890', documents: [{ typeCode: 'label', content: btoa('%PDF-1.4 fake') }] }); return Response.json({ shipments: [{ status: 'transit', events: [{ description: 'Processed at KATHMANDU', date: '2026-10-02' }] }] }); }
  if (['hooks.example.test', 'hooks.zapier.com', 'hook.eu2.make.com', 'hooks.slack.com'].includes(u.host)) { hookCalls.push({ host: u.host, headers: Object.fromEntries(req.headers), body, raw: await req.clone().text() }); return new Response('ok'); }
  if (u.host === 'api.sparrowsms.com') {
    const form = req.method === 'POST' ? Object.fromEntries(new URLSearchParams(await req.clone().text())) : Object.fromEntries(u.searchParams);
    smsCalls.push({ path: u.pathname, form });
    if (form.token !== 'sp-ok') return Response.json({ response_code: 1002, response: 'Invalid Token' }, { status: 403 });
    if (u.pathname.endsWith('/credit/')) return Response.json({ credits_available: 90, credits_consumed: 10, response_code: 200 });
    return Response.json({ count: 1, response_code: 200, response: '1 mesages has been queued for delivery' });
  }
  if (u.host === 'oauth2.googleapis.com') { gCalls.push({ token: true }); return Response.json({ access_token: 'ya29.x', expires_in: 3600 }); }
  if (u.host === 'sheets.googleapis.com') {
    gCalls.push({ method: req.method, path: decodeURIComponent(u.pathname + u.search), body });
    if (req.method === 'GET') return Response.json({ properties: { title: 'Chyau sales' }, sheets: gTabs.map((t) => ({ properties: { title: t } })) });
    if (u.pathname.endsWith(':batchUpdate')) { gTabs.push(body.requests[0].addSheet.properties.title); return Response.json({}); }
    return Response.json({ updates: { updatedRows: 1 } });
  }
  if (u.host === 'us21.api.mailchimp.com') {
    mcCalls.push({ method: req.method, path: u.pathname, body, auth: req.headers.get('Authorization') });
    if (req.method === 'GET') return Response.json({ name: 'Customers', stats: { member_count: 3 } });
    if (body.email_address === 'old@x.com') return Response.json({ title: 'Member Exists', detail: 'already' }, { status: 400 });
    return Response.json({ id: 'm1', status: body.status });
  }
  if (u.host === 'api.hubapi.com') {
    hsCalls.push({ method: req.method, path: u.pathname + u.search, body });
    if (req.method === 'GET') return Response.json({ results: [] });
    if (req.method === 'POST' && body.properties.email === 'old@x.com') return Response.json({ message: 'Contact already exists' }, { status: 409 });
    return Response.json({ id: '1' }, { status: req.method === 'POST' ? 201 : 200 });
  }
  if (u.host === 'dev.khalti.com' || u.host === 'khalti.com') {
    kCalls.push({ host: u.host, path: u.pathname, body, auth: req.headers.get('Authorization') });
    if (req.headers.get('Authorization') !== 'Key test-secret') return Response.json({ detail: 'Invalid token.' }, { status: 401 });
    if (u.pathname.endsWith('/epayment/initiate/')) return Response.json({ pidx: 'PIDX123', payment_url: 'https://test-pay.khalti.com/?pidx=PIDX123', expires_in: 1800 });
    if (u.pathname.endsWith('/epayment/lookup/')) return body.pidx === 'PIDX123' ? Response.json({ pidx: 'PIDX123', total_amount: 61000, status: kState.status, transaction_id: 'KTX9' }) : Response.json({ detail: 'Not found.' }, { status: 404 });
    if (u.pathname.includes('/merchant-transaction/')) return Response.json({ detail: 'Transaction refunded.' });
  }
  if (u.host === 'rc.esewa.com.np') { eCalls.push(Object.fromEntries(u.searchParams)); return Response.json({ product_code: 'EPAYTEST', transaction_uuid: u.searchParams.get('transaction_uuid'), total_amount: Number(u.searchParams.get('total_amount')), status: eState.status, ref_id: 'ES77' }); }
  if (u.host === 'uat.connectips.com') { cCalls.push({ path: u.pathname, body, auth: req.headers.get('Authorization') }); return Response.json({ merchantId: body.merchantId, appId: body.appId, referenceId: body.referenceId, txnAmt: body.txnAmt, status: 'SUCCESS', statusDesc: 'TRANSACTION SUCCESSFULL' }); }
  if (u.host === 'cbapi.ird.gov.np') { irdCalls.push({ path: u.pathname, body }); return new Response(body.password === 'ok' ? (irdCalls.filter((x) => x.path === u.pathname && x.body.invoice_number === body.invoice_number).length > 1 && u.pathname === '/api/bill' ? '101' : '200') : '100'); }
  if (u.host === 'api.telegram.org') {
    tgCalls.push({ method: u.pathname.split('/').pop(), body });
    if (u.pathname.endsWith('/getMe')) return Response.json({ ok: true, result: { id: 99, username: 'chyau_bot', first_name: 'Chyau' } });
    return Response.json({ ok: true, result: true });
  }
  if (u.host === 'api.openai.com') return Response.json({ choices: [{ message: { role: 'assistant', content: '2 orders need settling.' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } });
  if (u.href === `${STRATEK}/mcp`) return Response.json({ jsonrpc: '2.0', id: 1, result: { tools: [] } });
  if (u.href === `${STRATEK}/api/v1/connectors/events`) { const b = await req.json(); stratekEvents.push({ body: b, sig: req.headers.get('X-Stratek-Signature') }); return Response.json({ success: true, data: { recorded: true } }); }
  return stratekFetch(input, init);
};

async function paired(extraMap) {
  const env = makeEnv({ INSTALL_SECRET: 'i' });
  if (extraMap) for (const [k, v] of Object.entries(extraMap)) env._map.set(k, v);
  await go(env, '/connect/auto', { method: 'POST', body: JSON.stringify({ code: 'a'.repeat(64), secret: 'i' }) });
  const now = Math.floor(Date.now() / 1000);
  const session = await pass({ iss: STRATEK, aud: 'conn-1', sub: 'merchant:1', iat: now, exp: now + 3600, src: 'session' });
  const server = await pass({ iss: STRATEK, aud: 'conn-1', sub: 'merchant:1', iat: now, exp: now + 120, src: 'server' });
  const H = (t) => ({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });
  const save = async (int, mode, values) => (await go(env, `/secrets/${int}`, { method: 'POST', headers: H(session), body: JSON.stringify({ mode, values }) })).json();
  const act = async (int, a, body = {}, t = session) => (await go(env, `/actions/${int}/${a}`, { method: 'POST', headers: H(t), body: JSON.stringify(body) })).json();
  const manifest = async () => (await (await go(env, '/manifest', { headers: H(session) })).json()).data.integrations;
  const view = async (int, mode) => (await (await go(env, `/secrets/${int}?mode=${mode}`, { headers: H(session) })).json()).data;
  return { env, save, act, manifest, view, server };
}

test('live and test keys are separate; actions pick them by mode', async () => {
  const c = await paired();
  const l = await c.save('paybridgenp', 'live', { PAYBRIDGE_SECRET_KEY: 'sk_live_aaaaaaaaaaaaaaaa' });
  assert.equal(l.data.ready, true); assert.equal(l.data.mode, 'live');
  assert.match(l.data.notice, /notifications/);
  assert.equal(pbHooks.at(-1).url, `${SELF}/webhooks/paybridgenp`);
  let m = (await c.manifest()).find((i) => i.id === 'paybridgenp');
  assert.equal(m.ready, true); assert.equal(m.testReady, false); assert.equal(m.test.support, 'real-money');
  const t = await c.save('paybridgenp', 'test', { PAYBRIDGE_SECRET_KEY: 'sk_test_bbbbbbbbbbbbbbbb' });
  assert.equal(t.data.ready, true); assert.equal(t.data.mode, 'test');
  assert.equal(pbHooks.at(-1).url, `${SELF}/webhooks/paybridgenp/test`, 'test keys register the /test webhook');
  m = (await c.manifest()).find((i) => i.id === 'paybridgenp');
  assert.equal(m.testReady, true);
  assert.equal((await c.view('paybridgenp', 'live')).secrets[0].masked, 'sk_…aaaa');
  assert.equal((await c.view('paybridgenp', 'test')).secrets[0].masked, 'sk_…bbbb');
  seen.length = 0;
  const live = await c.act('paybridgenp', 'test', {});
  assert.match(live.data.result.text, /LIVE/); assert.equal(seen[0].auth, 'Bearer sk_live_aaaaaaaaaaaaaaaa');
  const tst = await c.act('paybridgenp', 'test', { mode: 'test' });
  assert.match(tst.data.result.text, /TEST/); assert.equal(tst.data.result.testMode, true);
  assert.equal(seen.at(-1).auth, 'Bearer sk_test_bbbbbbbbbbbbbbbb');
  // separate webhook memories
  const liveHook = c.env._map.get('data:paybridgenp:webhook'); const testHook = c.env._map.get('data:paybridgenp:test:webhook');
  assert.ok(liveHook.secret && testHook.secret && liveHook.secret !== testHook.secret);
});

test('integrations without a test environment are live only', async () => {
  const c = await paired();
  const r = await c.save('coinbase', 'test', { COINBASE_API_KEY_NAME: 'x' });
  assert.equal(r.error.code, 'NO_TEST_MODE');
  const m = (await c.manifest()).find((i) => i.id === 'coinbase');
  assert.equal(m.test.support, 'none'); assert.equal(m.testReady, false); assert.deepEqual(m.testSecrets, []);
  assert.equal((await c.act('coinbase', 'test', { mode: 'test' })).error.code, 'NO_TEST_MODE');
});

test('Meta CAPI: test event code only in test mode', async () => {
  const c = await paired();
  await c.save('meta_capi', 'live', { META_PIXEL_ID: 'p1', META_CAPI_TOKEN: 'tok' });
  let m = (await c.manifest()).find((i) => i.id === 'meta_capi');
  assert.equal(m.testReady, false, 'test needs the test event code');
  assert.ok(!m.secrets.find((s) => s.name === 'META_TEST_EVENT_CODE'), 'not a live key');
  await c.save('meta_capi', 'test', { META_PIXEL_ID: 'p1', META_CAPI_TOKEN: 'tok', META_TEST_EVENT_CODE: 'TEST1' });
  m = (await c.manifest()).find((i) => i.id === 'meta_capi');
  assert.equal(m.testReady, true);
  const ctx = { transaction: { id: 5, amount: 100, currency: 'NPR', items: [] } };
  seen.length = 0; await c.act('meta_capi', 'send_purchase', { context: ctx, fields: { email: 'a@b.co' } });
  const liveCall = seen.find((x) => x.host === 'graph.facebook.com');
  assert.ok(liveCall && !liveCall.body.test_event_code);
  seen.length = 0; await c.act('meta_capi', 'send_purchase', { mode: 'test', context: { transaction: { ...ctx.transaction, id: 6 } }, fields: { email: 'a@b.co' } });
  assert.equal(seen.find((x) => x.host === 'graph.facebook.com')?.body.test_event_code, 'TEST1');
});

test('old test keys move to Test automatically (v0.8.0 migration) and their webhook keeps working', async () => {
  const c = await paired({
    secrets: { PAYBRIDGE_SECRET_KEY: 'sk_test_old_key_123456', PATHAO_BASE_URL: 'https://pathao.test', PATHAO_CLIENT_ID: 'c', PATHAO_CLIENT_SECRET: 's', PATHAO_USERNAME: 'u', PATHAO_PASSWORD: 'p', PAYPAL_CLIENT_ID: 'x', PAYPAL_CLIENT_SECRET: 'y', PAYPAL_MODE: 'sandbox' },
    'data:paybridgenp:webhook': { id: 'wh_old', secret: 'whsec_old', url: `${SELF}/webhooks/paybridgenp` },
  });
  const ms = await c.manifest();
  const pb = ms.find((i) => i.id === 'paybridgenp'); const pa = ms.find((i) => i.id === 'pathao'); const pp = ms.find((i) => i.id === 'paypal');
  assert.equal(pb.ready, false); assert.equal(pb.testReady, true, 'sk_test_ key moved to Test');
  assert.equal(pa.ready, true, 'Pathao keys (no test marker) stay Live');
  assert.equal(pp.testReady, true, 'PayPal sandbox mode moved to Test'); assert.equal(pp.ready, false);
  assert.equal(c.env._map.get('secrets_test').PAYPAL_MODE, undefined);
  assert.ok(c.env._map.get('data:paybridgenp:test:webhook').legacyUrl);
  assert.deepEqual(c.env._map.get('keys_v2').moved.sort(), ['paybridgenp', 'paypal']);
  // PayBridgeNP still posts to the old (live) address: handled as test mode
  const raw = JSON.stringify({ type: 'payment.failed', data: {} });
  const t = Math.floor(Date.now() / 1000);
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode('whsec_old'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = Buffer.from(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`${t}.${raw}`))).toString('hex');
  const r = await go(c.env, '/webhooks/paybridgenp', { method: 'POST', headers: { 'X-PayBridgeNP-Signature': `t=${t},v1=${sig}` }, body: raw });
  assert.equal(r.status, 200); assert.equal((await r.json()).data.ignored, 'payment.failed');
});

test('Pathao: sandbox test keys, city/zone/area lists, live quote, booking with location', async () => {
  const c = await paired();
  const base = { PATHAO_CLIENT_ID: 'c', PATHAO_CLIENT_SECRET: 's', PATHAO_USERNAME: 'u', PATHAO_PASSWORD: 'p', PATHAO_STORE_ID: 'ID 7 (Chyau)' };
  await c.save('pathao', 'live', { ...base, PATHAO_BASE_URL: 'https://pathao.test' });
  await c.save('pathao', 'test', { ...base, PATHAO_BASE_URL: 'https://pathao-sandbox.test' });
  seen.length = 0;
  const tr = await c.act('pathao', 'test', { mode: 'test' });
  assert.match(tr.data.result.text, /2 cities/); assert.match(tr.data.result.text, /Rs 110/); assert.match(tr.data.result.text, /Using store ID 7/);
  assert.ok(seen.every((x) => x.host !== 'pathao.test'), 'test mode only talks to the sandbox');
  const cities = (await c.act('pathao', 'cities', {}, c.server)).data.result.items;
  assert.deepEqual(cities[0], { id: 1, name: 'Kathmandu' });
  const zones = (await c.act('pathao', 'zones', { context: { cityId: 1 } }, c.server)).data.result.items;
  assert.equal(zones[0].id, 11);
  const areas = (await c.act('pathao', 'areas', { context: { zoneId: 11 } }, c.server)).data.result.items;
  assert.equal(areas[0].name, 'Naya Baneshwor');
  const q = (await c.act('pathao', 'quote', { context: { cityId: 1, zoneId: 11, weight: 1 } }, c.server)).data.result;
  assert.equal(q.price, 110);
  const priceCall = seen.filter((x) => x.path.endsWith('/merchant/price-plan')).at(-1);
  assert.equal(priceCall.body.store_id, 7); assert.equal(priceCall.body.recipient_zone, 11);
  assert.equal((await c.act('pathao', 'zones', { context: { cityId: 'x' } }, c.server)).error.message, 'Choose a city.');
  // cached: a second list call does not hit Pathao again
  const before = seen.length; await c.act('pathao', 'cities', {}, c.server); assert.equal(seen.filter((x, i) => i >= before && x.path.endsWith('/city-list')).length, 0);
  // booking carries the chosen location
  await c.act('pathao', 'create_delivery', { context: { transaction: { id: 9, items: [] }, delivery: { cityId: 1, zoneId: 11, areaId: 111 } }, fields: { recipientName: 'A', recipientPhone: '98', recipientAddress: 'X', codAmount: 0 } });
  const order = seen.filter((x) => x.path.endsWith('/orders')).at(-1);
  assert.equal(order.host, 'pathao.test'); assert.equal(order.body.recipient_area, 111); assert.equal(order.body.amount_to_collect, 0);
});

test('outbound money actions: refused for API keys / agents, allowed for people and Stratek after approval', async () => {
  const c = await paired();
  await c.save('paybridgenp', 'live', { PAYBRIDGE_SECRET_KEY: 'sk_live_aaaaaaaaaaaaaaaa' });
  const m = (await c.manifest()).find((i) => i.id === 'paybridgenp');
  assert.equal(m.actions.find((a) => a.id === 'refund').outbound, true);
  assert.equal(m.actions.find((a) => a.id === 'check').outbound, false);
  const now = Math.floor(Date.now() / 1000);
  const agent = await pass({ iss: STRATEK, aud: 'conn-1', sub: 'merchant:1', iat: now, exp: now + 600, src: 'api_key' });
  const r = await c.act('paybridgenp', 'refund', { context: { transaction: { id: 1 } }, fields: {} }, agent);
  assert.equal(r.error.code, 'APPROVAL_REQUIRED');
  const ok = await c.act('paybridgenp', 'test', {}, agent);
  assert.equal(ok.success, true, 'safe actions still run for agents');
  const pathao = (await c.manifest()).find((i) => i.id === 'pathao');
  assert.equal(pathao.actions.find((a) => a.id === 'create_delivery').outbound, true);
  assert.equal(pathao.actions.find((a) => a.id === 'quote').outbound, false);
  // server pass (Stratek, after a person approved) is not blocked by the rule
  const srv = await c.act('paybridgenp', 'refund', { context: { transaction: { id: 1 } }, fields: {} }, c.server);
  assert.notEqual(srv.error?.code, 'APPROVAL_REQUIRED');
});

test('Pathao delivery notifications (0.10.0): secret check, 202 + integration header, signed delivery.status', async () => {
  const c = await paired();
  const keys = { PATHAO_BASE_URL: 'https://pathao-sandbox.test', PATHAO_CLIENT_ID: 'c', PATHAO_CLIENT_SECRET: 's', PATHAO_USERNAME: 'u', PATHAO_PASSWORD: 'p', PATHAO_STORE_ID: '7' };
  await c.save('pathao', 'test', { ...keys, PATHAO_WEBHOOK_SECRET: 'hook-secret-123' });
  const setup = await (await go(c.env, '/setup/pathao')).text();
  assert.match(setup, /webhooks\/pathao\/test/, 'Set up page shows the test callback URL');
  const hook = (body, sig = 'hook-secret-123', path = '/webhooks/pathao/test') => go(c.env, path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PATHAO-Signature': sig }, body: JSON.stringify(body) });
  let r = await hook({ event: 'webhook_integration' });
  assert.equal(r.status, 202); assert.equal(r.headers.get('X-Pathao-Merchant-Webhook-Integration-Secret'), 'f3992ecc-59da-4cbe-a049-a13da2018d51');
  r = await hook({ event: 'webhook_integration' }, 'wrong');
  assert.equal(r.status, 401, 'wrong secret refused');
  r = await hook({ event: 'webhook_integration' }, 'hook-secret-123', '/webhooks/pathao');
  assert.equal(r.status, 409, 'live keys have no webhook secret yet');
  // book a delivery (test keys) then Pathao reports progress
  const b = await c.act('pathao', 'create_delivery', { mode: 'test', context: { transaction: { id: 42, items: [] } }, fields: { recipientName: 'S', recipientPhone: '98', recipientAddress: 'KTM', codAmount: 0 } }, c.server);
  assert.match(b.data.result.text, /NP9/);
  stratekEvents.length = 0;
  r = await hook({ event: 'order.delivered', merchant_order_id: 'STK-42', consignment_id: 'NP9', delivery_fee: 110, updated_at: '2026-09-30 10:00:00' });
  assert.equal(r.status, 202);
  assert.equal(stratekEvents.length, 1);
  const ev = stratekEvents[0].body;
  assert.equal(ev.type, 'delivery.status'); assert.equal(ev.mode, 'test');
  assert.deepEqual({ tx: ev.data.transactionId, st: ev.data.status, c: ev.data.consignmentId }, { tx: '42', st: 'delivered', c: 'NP9' });
  assert.match(stratekEvents[0].sig, /^t=\d+,sig=/);
  // unknown consignment / other shop's order / unknown event: accepted but not forwarded
  stratekEvents.length = 0;
  await hook({ event: 'order.delivered', merchant_order_id: 'STK-42', consignment_id: 'OTHER' });
  await hook({ event: 'order.delivered', merchant_order_id: 'STK-999', consignment_id: 'NP9' });
  await hook({ event: 'order.something', merchant_order_id: 'STK-42', consignment_id: 'NP9' });
  assert.equal(stratekEvents.length, 0);
  assert.equal(c.env._map.get('data:pathao:test:tx:42').status, 'delivered');
});

test('storefront (0.11.0): config via pass only, own domain + workers.dev/shop matching', async () => {
  const { matchStorefront, cleanStorefront } = await import('../src/storefront.js');
  assert.throws(() => cleanStorefront({ slug: 'Bad Slug' }));
  assert.throws(() => cleanStorefront({ slug: 'chyau', hostnames: ['x.workers.dev'] }));
  const cfg = cleanStorefront({ slug: 'chyau', workersDev: true, hostnames: ['Shop.ChyauBio.com'] });
  assert.deepEqual(cfg.hostnames, ['shop.chyaubio.com']);
  assert.equal(matchStorefront(cfg, new URL('https://shop.chyaubio.com/anything')).base, '');
  assert.equal(matchStorefront(cfg, new URL(`${SELF}/shop/order/abc`)).base, '/shop');
  assert.equal(matchStorefront(cfg, new URL(`${SELF}/setup/pathao`)), null, 'connector pages untouched on workers.dev');
  assert.equal(matchStorefront({ ...cfg, workersDev: false }, new URL(`${SELF}/shop/`)), null);
  const c = await paired();
  const noPass = await go(c.env, '/storefront', { method: 'POST', body: JSON.stringify({ slug: 'chyau', workersDev: true }) });
  assert.equal(noPass.status, 401);
  const r = await (await go(c.env, '/storefront', { method: 'POST', headers: { Authorization: `Bearer ${c.server}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: 'chyau', workersDev: true }) })).json();
  assert.equal(r.data.slug, 'chyau');
  assert.equal(c.env._map.get('storefront').workersDev, true);
});

test('AI employee (0.12.0): identity only from Stratek, tasks only from a signed-in person', async () => {
  const c = await paired();
  let r = await go(c.env, '/agent-key', { method: 'POST', body: JSON.stringify({ key: 'stk_m_' + 'a'.repeat(64) }) });
  assert.equal(r.status, 401, 'no pass, no identity');
  r = await (await go(c.env, '/agent-key', { method: 'POST', headers: { Authorization: `Bearer ${c.server}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'stk_m_' + 'a'.repeat(64) }) })).json();
  assert.equal(r.data.linked, true);
  assert.ok(c.env._map.get('data:ai_employee:agent_key').key.startsWith('stk_m_'));
  await c.save('ai_employee', 'live', { AI_PROVIDER: 'openai', AI_API_KEY: 'sk-x', AI_MODEL: 'm' });
  const t = await c.act('ai_employee', 'task', { fields: { message: 'hi' } }, c.server);
  assert.equal(t.success, false); assert.match(t.error.message, /person signed in/);
  const m = (await c.manifest()).find((i) => i.id === 'ai_employee');
  assert.equal(m.test.support, 'none'); assert.equal(m.category, 'ai');
  r = await (await go(c.env, '/agent-key', { method: 'POST', headers: { Authorization: `Bearer ${c.server}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ off: true }) })).json();
  assert.equal(r.data.linked, false); assert.equal(c.env._map.get('data:ai_employee:agent_key'), undefined);
});

test('Telegram (0.13.0): bot setup, one-time link, only the linked account, alerts from Stratek only, chat to the AI employee', async () => {
  const c = await paired();
  const saved = await c.save('telegram', 'live', { TELEGRAM_BOT_TOKEN: '123:abc' });
  assert.equal(saved.success, true); assert.match(saved.data.notice, /@chyau_bot/);
  const hook = tgCalls.find((x) => x.method === 'setWebhook');
  assert.equal(hook.body.url, 'https://stratek-connector.test.workers.dev/webhooks/telegram');
  const secret = hook.body.secret_token; assert.ok(secret.length >= 32);
  const m = (await c.manifest()).find((i) => i.id === 'telegram');
  assert.equal(m.status, 'available'); assert.equal(m.test.support, 'none');
  // link: people only
  assert.equal((await c.act('telegram', 'link', {}, c.server)).success, false);
  const link = (await c.act('telegram', 'link')).data.result;
  assert.match(link.url, /^https:\/\/t\.me\/chyau_bot\?start=[0-9a-f]{32}$/);
  const code = link.url.split('=')[1];
  let upd = 1;
  const hookPost = (msg, sec = secret) => go(c.env, '/webhooks/telegram', { method: 'POST', headers: { 'X-Telegram-Bot-Api-Secret-Token': sec, 'Content-Type': 'application/json' }, body: JSON.stringify({ update_id: upd++, message: msg }) });
  const from = { id: 5, first_name: 'Gunjan', username: 'gunjan' };
  assert.equal((await hookPost({ text: `/start ${code}`, chat: { id: 5, type: 'private' }, from }, 'wrong')).status, 403, 'secret header checked');
  // a group can't link
  await hookPost({ text: `/start ${code}`, chat: { id: -7, type: 'group' }, from });
  assert.equal(c.env._map.get('data:telegram:owner'), undefined);
  await hookPost({ text: `/start ${code}`, chat: { id: 5, type: 'private' }, from });
  assert.equal(c.env._map.get('data:telegram:owner').userId, 5);
  // code is one-time: someone else can't take over
  const before = tgCalls.length;
  await hookPost({ text: `/start ${code}`, chat: { id: 8, type: 'private' }, from: { id: 8, first_name: 'X' } });
  assert.equal(c.env._map.get('data:telegram:owner').userId, 5);
  await hookPost({ text: 'show me sales', chat: { id: 8, type: 'private' }, from: { id: 8, first_name: 'X' } });
  assert.equal(tgCalls.slice(before).filter((x) => x.method === 'sendMessage' && x.body.chat_id === 8 && !/expired/.test(x.body.text)).length, 0, 'strangers get nothing');
  // retried update is handled once
  const dup = await go(c.env, '/webhooks/telegram', { method: 'POST', headers: { 'X-Telegram-Bot-Api-Secret-Token': secret }, body: JSON.stringify({ update_id: 1, message: { text: 'hi', chat: { id: 5, type: 'private' }, from } }) });
  assert.equal((await dup.json()).data.duplicate, true);
  // alerts: Stratek's server only; button only to Stratek
  assert.equal((await c.act('telegram', 'alert', { fields: { text: 'x' } })).success, false, 'not from a browser session');
  const a = await c.act('telegram', 'alert', { fields: { text: 'Approval needed', buttonLabel: 'Review', buttonUrl: 'https://strateknepal.com/dashboard.html#integrations' } }, c.server);
  assert.equal(a.success, true);
  let sent = tgCalls.filter((x) => x.method === 'sendMessage').pop();
  assert.equal(sent.body.chat_id, 5); assert.equal(sent.body.reply_markup.inline_keyboard[0][0].url, 'https://strateknepal.com/dashboard.html#integrations');
  await c.act('telegram', 'alert', { fields: { text: 'Phish', buttonUrl: 'https://evil.test/' } }, c.server);
  sent = tgCalls.filter((x) => x.method === 'sendMessage').pop();
  assert.equal(sent.body.reply_markup, undefined, 'no buttons to other sites');
  // chat: AI employee off -> tells how to switch on
  await hookPost({ text: 'which orders need settling?', chat: { id: 5, type: 'private' }, from });
  assert.match(tgCalls.filter((x) => x.method === 'sendMessage').pop().body.text, /AI employee is off/);
  // AI employee on -> answers in Telegram
  await c.save('ai_employee', 'live', { AI_PROVIDER: 'openai', AI_API_KEY: 'sk-x', AI_MODEL: 'm' });
  await go(c.env, '/agent-key', { method: 'POST', headers: { Authorization: `Bearer ${c.server}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'stk_m_' + 'a'.repeat(64) }) });
  await hookPost({ text: 'which orders need settling?', chat: { id: 5, type: 'private' }, from });
  assert.equal(tgCalls.filter((x) => x.method === 'sendMessage').pop().body.text, '2 orders need settling.');
  assert.equal(c.env._map.get('data:ai_employee:history').length, 2);
  await hookPost({ text: '/new', chat: { id: 5, type: 'private' }, from });
  assert.equal(c.env._map.get('data:ai_employee:history').length, 0);
  // status + unlink (unlink: people only)
  assert.equal((await c.act('telegram', 'status', {}, c.server)).data.result.linked.username, 'gunjan');
  assert.equal((await c.act('telegram', 'unlink', {}, c.server)).success, false);
  await c.act('telegram', 'unlink');
  assert.equal(c.env._map.get('data:telegram:owner'), undefined);
  assert.equal((await c.act('telegram', 'alert', { fields: { text: 'x' } }, c.server)).success, false, 'no alerts once unlinked');
});

test('Wave 1 (0.14.0): Webhook, Zapier, Make, Slack, Sparrow SMS, Google Sheets, Mailchimp, HubSpot', async () => {
  const c = await paired();
  const saleCtx = { context: { transaction: { id: 42, amount: 610, currency: 'NPR', reference: 'Online order #12', items: [{ name: 'Oyster pack', price: 250, qty: 2 }], createdAt: '2026-09-30 05:00:00' }, customer: { name: 'Sita Sharma', email: 'sita@x.com', phone: '9800000001' } } };
  // Webhook: signed JSON
  await c.save('webhook', 'live', { WEBHOOK_URL: 'https://hooks.example.test/in', WEBHOOK_SECRET: 's3cret' });
  let r = await c.act('webhook', 'send', saleCtx);
  assert.equal(r.success, true, JSON.stringify(r));
  let h = hookCalls.at(-1);
  assert.equal(h.body.type, 'sale'); assert.equal(h.body.sale.id, '42'); assert.equal(h.body.customer.email, 'sita@x.com');
  const [, t, v1] = h.headers['x-stratek-signature'].match(/^t=(\d+),v1=([0-9a-f]{64})$/);
  const { createHmac } = await import('node:crypto');
  assert.equal(v1, createHmac('sha256', 's3cret').update(`${t}.${h.raw}`).digest('hex'), 'signature checks out');
  r = await c.act('webhook', 'send_inventory', { context: { menu: { currency: 'NPR', items: [{ id: 1, name: 'Oyster', price: 250 }] } } });
  assert.equal(hookCalls.at(-1).body.inventory.items.length, 1);
  await c.save('webhook', 'live', { WEBHOOK_URL: 'http://insecure.test/' });
  assert.match((await c.act('webhook', 'test')).error.message, /https/);
  // Zapier / Make: host checked
  await c.save('zapier', 'live', { ZAPIER_HOOK_URL: 'https://evil.test/x' });
  assert.match((await c.act('zapier', 'send', saleCtx)).error.message, /doesn't look like a Zapier/);
  await c.save('zapier', 'live', { ZAPIER_HOOK_URL: 'https://hooks.zapier.com/hooks/catch/1/abc/' });
  assert.equal((await c.act('zapier', 'send', saleCtx)).success, true);
  await c.save('make', 'live', { MAKE_WEBHOOK_URL: 'https://hook.eu2.make.com/abc' });
  assert.equal((await c.act('make', 'test')).success, true);
  assert.equal(hookCalls.at(-1).body.type, 'test');
  // Slack
  await c.save('slack', 'live', { SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/T/B/x' });
  await c.act('slack', 'notify', saleCtx);
  assert.match(hookCalls.at(-1).body.text, /Sale #42.*Rs 610/); assert.deepEqual(Object.keys(hookCalls.at(-1).body), ['text']);
  // Sparrow SMS
  await c.save('sparrow_sms', 'live', { SPARROW_SMS_TOKEN: 'sp-bad', SPARROW_SMS_FROM: 'InfoSMS' });
  assert.match((await c.act('sparrow_sms', 'test')).error.message, /token/);
  await c.save('sparrow_sms', 'live', { SPARROW_SMS_TOKEN: 'sp-ok' });
  assert.match((await c.act('sparrow_sms', 'test')).data.result.text, /Credits available: 90/);
  assert.match((await c.act('sparrow_sms', 'send_receipt', { ...saleCtx, fields: { phone: '12345' } })).error.message, /Nepali mobile/);
  r = await c.act('sparrow_sms', 'send_receipt', { ...saleCtx, fields: { phone: '+977 980-000-0001' } });
  assert.equal(r.success, true); assert.equal(smsCalls.at(-1).form.to, '9800000001'); assert.match(smsCalls.at(-1).form.text, /Receipt #42, Rs 610/);
  // Google Sheets (service account JWT signed with a real RSA key)
  const { generateKeyPairSync } = await import('node:crypto');
  const pk = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
  await c.save('google_sheets', 'live', { GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'stratek@proj.iam.gserviceaccount.com', private_key: pk }), GOOGLE_SHEET_ID: 'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit#gid=0' });
  assert.match((await c.act('google_sheets', 'test')).data.result.text, /Chyau sales/);
  r = await c.act('google_sheets', 'add_row', saleCtx);
  assert.equal(r.success, true, JSON.stringify(r));
  assert.ok(gTabs.includes('Sales'), 'Sales tab made');
  const append = gCalls.find((x) => x.path?.includes(':append'));
  assert.match(append.path, /1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/); assert.equal(append.body.values[0][1], 42); assert.equal(append.body.values[0][4], 610);
  r = await c.act('google_sheets', 'export_inventory', { context: { menu: { currency: 'NPR', items: [{ id: 7, name: 'Shiitake', price: 400, available: true }] } } });
  assert.equal(r.success, true); assert.ok(gTabs.includes('Inventory'));
  assert.equal(gCalls.filter((x) => x.token).length, 1, 'token cached');
  // Mailchimp: double opt-in by default
  await c.save('mailchimp', 'live', { MAILCHIMP_API_KEY: 'abc123-us21', MAILCHIMP_AUDIENCE_ID: 'aud1' });
  assert.match((await c.act('mailchimp', 'test')).data.result.text, /Customers/);
  r = await c.act('mailchimp', 'add_customer', { ...saleCtx, fields: {} });
  assert.equal(mcCalls.at(-1).body.status, 'pending'); assert.equal(mcCalls.at(-1).body.email_address, 'sita@x.com'); assert.equal(mcCalls.at(-1).body.merge_fields.FNAME, 'Sita');
  r = await c.act('mailchimp', 'add_customer', { ...saleCtx, fields: { email: 'old@x.com' } });
  assert.match(r.data.result.title, /Already/);
  // HubSpot: create, or update on conflict
  await c.save('hubspot', 'live', { HUBSPOT_TOKEN: 'pat-na1-x' });
  r = await c.act('hubspot', 'add_customer', { ...saleCtx, fields: {} });
  assert.equal(r.data.result.title, 'Added to HubSpot'); assert.equal(hsCalls.at(-1).body.properties.phone, '9800000001');
  r = await c.act('hubspot', 'add_customer', { ...saleCtx, fields: { email: 'old@x.com' } });
  assert.equal(r.data.result.title, 'Updated in HubSpot'); assert.match(hsCalls.at(-1).path, /idProperty=email/);
  // all eight are available in the manifest
  const m = await c.manifest();
  for (const id of ['webhook', 'zapier', 'make', 'slack', 'sparrow_sms', 'google_sheets', 'mailchimp', 'hubspot']) assert.equal(m.find((i) => i.id === id).status, 'available', id);
});

test('Wave 2 (0.15.0): Khalti, eSewa, connectIPS pay -> gateway check -> signed payment.succeeded; IRD CBMS bill + return in BS dates', async () => {
  const c = await paired();
  const saleCtx = { context: { transaction: { id: 77, amount: 610, currency: 'NPR', reference: 'Online order #12', items: [], bill: { total: 610, taxable: 400, vat: 52, subtotal: 558 }, createdAt: '2026-09-30 06:00:00' }, customer: { name: 'Sita Sharma', email: 'sita@x.com', phone: '9800000001' } } };
  const ev0 = stratekEvents.length;
  // ── Khalti (sandbox = Test keys) ──
  await c.save('khalti', 'test', { KHALTI_SECRET_KEY: 'test-secret' });
  let r = await c.act('khalti', 'payment_link', { ...saleCtx, mode: 'test' });
  assert.equal(r.success, true, JSON.stringify(r));
  assert.equal(r.data.result.qrPayload, 'https://test-pay.khalti.com/?pidx=PIDX123');
  const init = kCalls.find((x) => x.path.endsWith('/initiate/'));
  assert.equal(init.host, 'dev.khalti.com'); assert.equal(init.body.amount, 61000); assert.equal(init.body.return_url, `${SELF}/pay/khalti/return/test`); assert.equal(init.body.customer_info.email, 'sita@x.com');
  let res = await go(c.env, '/pay/khalti/return/test?pidx=PIDX123&status=Completed');
  assert.equal(res.status, 400, 'not paid yet -> no event'); assert.equal(stratekEvents.length, ev0);
  kState.status = 'Completed';
  res = await go(c.env, '/pay/khalti/return/test?pidx=PIDX123');
  assert.equal(res.status, 200); assert.match(await res.text(), /Payment received/);
  let ev = stratekEvents.at(-1).body;
  assert.equal(ev.type, 'payment.succeeded'); assert.equal(ev.data.transactionId, '77'); assert.equal(ev.data.amount, 610); assert.equal(ev.data.integration, 'khalti'); assert.equal(ev.data.livemode, false); assert.equal(ev.mode, 'test');
  await go(c.env, '/pay/khalti/return/test?pidx=PIDX123');
  assert.equal(stratekEvents.length, ev0 + 1, 'reported once');
  r = await c.act('khalti', 'refund', { ...saleCtx, mode: 'test' }, c.server);
  assert.equal(r.success, true); assert.match(kCalls.at(-1).path, /merchant-transaction\/KTX9\/refund/);
  const apiKeyPass = await pass({ iss: STRATEK, aud: 'conn-1', sub: 'merchant:1', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60, src: 'api_key' });
  assert.equal((await c.act('khalti', 'refund', { ...saleCtx, mode: 'test' }, apiKeyPass)).error.code, 'APPROVAL_REQUIRED');
  // ── eSewa (UAT with EPAYTEST) ──
  await c.save('esewa', 'test', { ESEWA_MERCHANT_CODE: 'EPAYTEST', ESEWA_SECRET_KEY: '8gBm/:&EnhH.1/q' });
  r = await c.act('esewa', 'payment_link', { ...saleCtx, mode: 'test' });
  const startUrl = r.data.result.qrPayload;
  assert.match(startUrl, /\/pay\/esewa\/start\/test\/[0-9a-f]{36}$/);
  res = await go(c.env, new URL(startUrl).pathname);
  const page = await res.text();
  assert.match(page, /action="https:\/\/rc-epay\.esewa\.com\.np\/api\/epay\/main\/v2\/form"/);
  const val = (n) => page.match(new RegExp(`name="${n}" value="([^"]*)"`))[1];
  const { createHmac } = await import('node:crypto');
  const uuid = val('transaction_uuid');
  assert.equal(val('total_amount'), '610.00');
  assert.equal(val('signature'), createHmac('sha256', '8gBm/:&EnhH.1/q').update(`total_amount=610.00,transaction_uuid=${uuid},product_code=EPAYTEST`).digest('base64'));
  const result = { transaction_code: '000AWEO', status: 'COMPLETE', total_amount: '610.0', transaction_uuid: uuid, product_code: 'EPAYTEST', signed_field_names: 'transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names' };
  const forged = { ...result, signature: 'bad' };
  res = await go(c.env, `/pay/esewa/return/test?data=${encodeURIComponent(btoa(JSON.stringify(forged)))}`);
  assert.equal(res.status, 400, 'bad signature refused');
  result.signature = createHmac('sha256', '8gBm/:&EnhH.1/q').update(result.signed_field_names.split(',').map((n) => `${n}=${result[n]}`).join(',')).digest('base64');
  res = await go(c.env, `/pay/esewa/return/test?data=${encodeURIComponent(btoa(JSON.stringify(result)))}`);
  assert.equal(res.status, 400, 'status API still PENDING -> not paid');
  eState.status = 'COMPLETE';
  res = await go(c.env, `/pay/esewa/return/test?data=${encodeURIComponent(btoa(JSON.stringify(result)))}`);
  assert.equal(res.status, 200); ev = stratekEvents.at(-1).body;
  assert.equal(ev.data.integration, 'esewa'); assert.equal(ev.data.providerRef, 'ES77'); assert.equal(eCalls.at(-1).total_amount, '610.00');
  // ── connectIPS (UAT) ──
  const { generateKeyPairSync, createVerify } = await import('node:crypto');
  const kp = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pkcs1 = kp.privateKey.export({ type: 'pkcs1', format: 'pem' }).replace(/\n/g, ' ');
  await c.save('connectips', 'test', { CONNECTIPS_MERCHANT_ID: '123', CONNECTIPS_APP_ID: 'MER-123-APP-1', CONNECTIPS_APP_NAME: 'Chyau', CONNECTIPS_PASSWORD: 'pw', CONNECTIPS_PRIVATE_KEY: pkcs1 });
  assert.match((await c.act('connectips', 'test', { mode: 'test' })).data.result.text, /pay\/connectips\/return\/test/);
  r = await c.act('connectips', 'payment_link', { ...saleCtx, mode: 'test' });
  res = await go(c.env, new URL(r.data.result.qrPayload).pathname);
  const cp = await res.text();
  const cval = (n) => cp.match(new RegExp(`name="${n}" value="([^"]*)"`))[1].replace(/&amp;/g, '&');
  assert.match(cp, /action="https:\/\/uat\.connectips\.com\/connectipswebgw\/loginpage"/);
  const msg = ['MERCHANTID', 'APPID', 'APPNAME', 'TXNID', 'TXNDATE', 'TXNCRNCY', 'TXNAMT', 'REFERENCEID', 'REMARKS', 'PARTICULARS'].map((n) => `${n}=${cval(n)}`).join(',') + ',TOKEN=TOKEN';
  assert.equal(cval('TXNAMT'), '61000'); assert.match(cval('TXNDATE'), /^\d\d-\d\d-\d{4}$/);
  assert.ok(createVerify('RSA-SHA256').update(msg).verify(kp.publicKey, cval('TOKEN'), 'base64'), 'token is a valid SHA256withRSA signature (PKCS#1 key accepted)');
  res = await go(c.env, `/pay/connectips/return/test?TXNID=${cval('TXNID')}`);
  assert.equal(res.status, 200); ev = stratekEvents.at(-1).body;
  assert.equal(ev.data.integration, 'connectips'); assert.equal(cCalls.at(-1).auth, `Basic ${btoa('MER-123-APP-1:pw')}`);
  assert.ok(createVerify('RSA-SHA256').update(`MERCHANTID=123,APPID=MER-123-APP-1,REFERENCEID=${cval('TXNID')},TXNAMT=61000`).verify(kp.publicKey, cCalls.at(-1).body.token, 'base64'));
  // ── IRD CBMS (live only) ──
  await c.save('ird_cbms', 'live', { IRD_USERNAME: 'u', IRD_PASSWORD: 'bad', IRD_SELLER_PAN: '600123456' });
  assert.match((await c.act('ird_cbms', 'report_bill', saleCtx)).error.message, /did not accept/);
  await c.save('ird_cbms', 'live', { IRD_PASSWORD: 'ok' });
  r = await c.act('ird_cbms', 'report_bill', { ...saleCtx, fields: { buyerPan: '301234567' } });
  assert.equal(r.success, true, JSON.stringify(r));
  const bill = irdCalls.at(-1).body;
  assert.equal(bill.invoice_date, '2083.06.14'); assert.equal(bill.fiscal_year, '2083.084'); assert.equal(bill.total_sales, 610); assert.equal(bill.taxable_sales_vat, 400); assert.equal(bill.vat, 52); assert.equal(bill.tax_exempted_sales, 158); assert.equal(bill.buyer_name, 'Sita Sharma'); assert.equal(bill.isrealtime, true);
  r = await c.act('ird_cbms', 'report_bill', saleCtx);
  assert.equal(r.data.result.status, 'Already reported');
  r = await c.act('ird_cbms', 'report_return', { ...saleCtx, fields: { reason: 'Returned' } });
  assert.equal(r.success, true); assert.equal(irdCalls.at(-1).path, '/api/billreturn'); assert.equal(irdCalls.at(-1).body.ref_invoice_number, '77');
  assert.equal((await c.act('ird_cbms', 'report_bill', { ...saleCtx, mode: 'test' })).success, false, 'never in test mode');
  const m = await c.manifest();
  for (const id of ['khalti', 'esewa', 'connectips', 'ird_cbms']) assert.equal(m.find((i) => i.id === id).status, 'available', id);
});

test('Wave 3 (0.17.0): WhatsApp, Viber, WooCommerce, Shopify, QuickBooks / Xero / Zoho Books (OAuth), DHL Express', async () => {
  const c = await paired();
  const saleCtx = { context: { transaction: { id: 88, amount: 565, currency: 'NPR', reference: 'Till', items: [{ name: 'Oyster pack', price: 250, qty: 2 }], createdAt: '2026-09-30 06:00:00' }, customer: { name: 'Sita Sharma', email: 'sita@x.com', phone: '9800000001' } } };
  const menuCtx = { context: { menu: { currency: 'NPR', items: [{ id: 1, name: 'Oyster pack', price: 250, available: true, description: 'Fresh', category: 'Mushrooms', photo: 'https://strateknepal.com/media/menu/1.jpg' }, { id: 2, name: 'Shiitake', price: 400, available: false }] } } };
  // ── WhatsApp ──
  await c.save('whatsapp', 'live', { WHATSAPP_TOKEN: 'EAAG', WHATSAPP_PHONE_NUMBER_ID: 'PHONE1', WHATSAPP_RECEIPT_TEMPLATE: 'stratek_receipt' });
  assert.match((await c.act('whatsapp', 'test')).data.result.text, /Chyau Bio/);
  let r = await c.act('whatsapp', 'send_receipt', saleCtx);
  assert.equal(r.success, true, JSON.stringify(r));
  let m = waCalls.at(-1).body;
  assert.equal(m.to, '9779800000001'); assert.equal(m.template.name, 'stratek_receipt'); assert.deepEqual(m.template.components[0].parameters.map((p) => p.text), ['our shop', '88', 'Rs 565']);
  r = await c.act('whatsapp', 'test_message', { fields: { phone: '+977 9800000002' } });
  assert.equal(waCalls.at(-1).body.template.name, 'hello_world');
  await c.save('whatsapp', 'live', { WHATSAPP_RECEIPT_TEMPLATE: 'missing' });
  assert.match((await c.act('whatsapp', 'send_receipt', saleCtx)).error.message, /not approved|does not exist/);
  // ── Viber ──
  const vs = await c.save('viber', 'live', { VIBER_BOT_TOKEN: 'vbtoken' });
  assert.match(vs.data.notice, /Chyau Bot/); assert.equal(viCalls.find((x) => x.path.endsWith('set_webhook')).body.url, `${SELF}/webhooks/viber`);
  assert.equal((await c.act('viber', 'link', {}, c.server)).success, false, 'people only');
  const link = (await c.act('viber', 'link')).data.result;
  const code = link.url.split('/').pop();
  let res = await go(c.env, new URL(link.url).pathname);
  assert.match(await res.text(), new RegExp(`viber://pa\\?chatURI=chyaubot&amp;context=${code}`));
  const { createHmac } = await import('node:crypto');
  const vhook = (obj, sig) => { const raw = JSON.stringify(obj); return go(c.env, '/webhooks/viber', { method: 'POST', headers: { 'X-Viber-Content-Signature': sig ?? createHmac('sha256', 'vbtoken').update(raw).digest('hex') }, body: raw }); };
  assert.equal((await vhook({ event: 'message', sender: { id: 'U1' } }, 'bad')).status, 403);
  res = await vhook({ event: 'conversation_started', user: { id: 'U1', name: 'Gunjan' }, context: code });
  assert.match((await res.json()).text, /send me any message/);
  await vhook({ event: 'message', sender: { id: 'U2' }, message: { text: 'hi' } });
  assert.equal(c.env._map.get('data:viber:owner'), undefined, 'a stranger cannot finish the link');
  await vhook({ event: 'message', sender: { id: 'U1' }, message: { text: 'hi' } });
  assert.equal(c.env._map.get('data:viber:owner').userId, 'U1');
  await c.act('viber', 'send_receipt', saleCtx);
  assert.equal(viCalls.at(-1).body.receiver, 'U1'); assert.match(viCalls.at(-1).body.text, /Sale #88: Rs 565/);
  // ── WooCommerce ──
  await c.save('woocommerce', 'live', { WOO_STORE_URL: 'http://shop.example.com', WOO_CONSUMER_KEY: 'ck_1', WOO_CONSUMER_SECRET: 'cs_1' });
  assert.match((await c.act('woocommerce', 'test')).error.message, /https/);
  await c.save('woocommerce', 'live', { WOO_STORE_URL: 'https://shop.example.com' });
  r = await c.act('woocommerce', 'sync_menu', menuCtx);
  assert.match(r.data.result.text, /2 added/);
  const created = wooCalls.filter((x) => x.method === 'POST');
  assert.equal(created[0].body.sku, 'stratek-1'); assert.equal(created[0].body.regular_price, '250.00'); assert.equal(created[1].body.status, 'draft'); assert.equal(created[0].auth, `Basic ${btoa('ck_1:cs_1')}`);
  r = await c.act('woocommerce', 'sync_menu', menuCtx);
  assert.match(r.data.result.text, /0 added, 0 updated, 2 already up to date/);
  menuCtx.context.menu.items[0].price = 275;
  r = await c.act('woocommerce', 'sync_menu', menuCtx);
  assert.match(r.data.result.text, /1 updated/); assert.equal(wooCalls.at(-1).method, 'PUT');
  assert.match((await c.act('woocommerce', 'orders')).data.result.text, /#101 processing NPR 500.00/);
  // ── Shopify ──
  await c.save('shopify', 'live', { SHOPIFY_STORE_DOMAIN: 'https://chyau.myshopify.com/admin', SHOPIFY_ACCESS_TOKEN: 'shpat_1' });
  assert.match((await c.act('shopify', 'test')).data.result.text, /Chyau/);
  r = await c.act('shopify', 'sync_menu', menuCtx);
  assert.match(r.data.result.text, /2 added/);
  assert.equal(shCalls.find((x) => x.method === 'POST').body.product.variants[0].sku, 'stratek-1'); assert.equal(shCalls.at(-1).token, 'shpat_1');
  menuCtx.context.menu.items[1].price = 450;
  await c.act('shopify', 'sync_menu', menuCtx);
  assert.ok(shCalls.some((x) => x.path.endsWith('/variants/77.json') && x.body.variant.price === '450.00'), 'price updated on the variant');
  // ── QuickBooks (OAuth, sandbox with Test keys) ──
  await c.save('quickbooks', 'test', { QUICKBOOKS_CLIENT_ID: 'qbid', QUICKBOOKS_CLIENT_SECRET: 'qbsec' });
  assert.equal((await c.act('quickbooks', 'connect', { mode: 'test' }, c.server)).success, false, 'people only');
  const ql = (await c.act('quickbooks', 'connect', { mode: 'test' })).data.result;
  assert.match(ql.text, /oauth\/quickbooks\/callback/);
  res = await go(c.env, new URL(ql.url).pathname);
  assert.equal(res.status, 302);
  const auth = new URL(res.headers.get('location'));
  assert.equal(auth.host, 'appcenter.intuit.com'); assert.equal(auth.searchParams.get('client_id'), 'qbid'); assert.equal(auth.searchParams.get('redirect_uri'), `${SELF}/oauth/quickbooks/callback`);
  res = await go(c.env, `/oauth/quickbooks/callback?code=C1&state=${auth.searchParams.get('state')}&realmId=R42`);
  assert.equal(res.status, 200); assert.match(await res.text(), /connected/);
  assert.equal(oaCalls.at(-1).auth, `Basic ${btoa('qbid:qbsec')}`);
  res = await go(c.env, `/oauth/quickbooks/callback?code=C1&state=${auth.searchParams.get('state')}`);
  assert.equal(res.status, 400, 'state is one-time');
  r = await c.act('quickbooks', 'send_sale', { ...saleCtx, mode: 'test' });
  assert.equal(r.success, true, JSON.stringify(r));
  assert.equal(oaCalls.at(-1).form.grant_type, 'refresh_token', 'expired token refreshed');
  const receipt = qbCalls.find((x) => x.path.includes('/salesreceipt'));
  assert.match(receipt.path, /\/company\/R42\//); assert.equal(receipt.body.Line[0].SalesItemLineDetail.ItemRef.value, '33'); assert.equal(receipt.body.Line.at(-1).Amount, 65, 'VAT/service line makes the total match');
  assert.equal((await c.act('quickbooks', 'send_sale', { ...saleCtx, mode: 'test' })).data.result.status, 'Already sent');
  // ── Xero ──
  await c.save('xero', 'live', { XERO_CLIENT_ID: 'xid', XERO_CLIENT_SECRET: 'xsec' });
  const xl = (await c.act('xero', 'connect')).data.result;
  res = await go(c.env, new URL(xl.url).pathname);
  const xa = new URL(res.headers.get('location'));
  assert.equal(xa.host, 'login.xero.com'); assert.match(xa.searchParams.get('scope'), /offline_access/);
  await go(c.env, `/oauth/xero/callback?code=X1&state=${xa.searchParams.get('state')}`);
  assert.equal(c.env._map.get('data:xero:oauth').tenantId, 'T-1');
  r = await c.act('xero', 'send_sale', saleCtx);
  const inv = xeCalls.find((x) => x.path.endsWith('/Invoices'));
  assert.equal(inv.tenant, 'T-1'); assert.equal(inv.body.Invoices[0].Contact.Name, 'Sita Sharma'); assert.equal(inv.body.Invoices[0].Status, 'AUTHORISED'); assert.equal(inv.body.Invoices[0].LineItems[0].AccountCode, '200');
  assert.match(r.data.result.text, /INV-0042/);
  // ── Zoho Books ──
  await c.save('zoho_books', 'live', { ZOHO_CLIENT_ID: 'zid', ZOHO_CLIENT_SECRET: 'zsec' });
  const zl = (await c.act('zoho_books', 'connect')).data.result;
  res = await go(c.env, new URL(zl.url).pathname);
  const za = new URL(res.headers.get('location'));
  assert.equal(za.host, 'accounts.zoho.com'); assert.equal(za.searchParams.get('access_type'), 'offline');
  await go(c.env, `/oauth/zoho_books/callback?code=Z1&state=${za.searchParams.get('state')}`);
  assert.equal(oaCalls.at(-1).form.client_secret, 'zsec', 'Zoho gets the secret in the body');
  r = await c.act('zoho_books', 'send_invoice', saleCtx);
  assert.equal(r.success, true, JSON.stringify(r));
  const zi = zoCalls.find((x) => x.path.includes('/invoices'));
  assert.match(zi.path, /organization_id=O1/); assert.equal(zi.body.customer_id, 'C9');
  // ── DHL Express (test credentials) ──
  await c.save('dhl', 'test', { DHL_API_KEY: 'k', DHL_API_SECRET: 's', DHL_ACCOUNT_NUMBER: '950000002', DHL_SHIPPER_NAME: 'Chyau Bio', DHL_SHIPPER_PHONE: '9800000000', DHL_SHIPPER_ADDRESS: 'Jhamsikhel', DHL_SHIPPER_CITY: 'Lalitpur', DHL_SHIPPER_POSTAL_CODE: '44700' });
  r = await c.act('dhl', 'quote', { ...saleCtx, mode: 'test', fields: { weight: 1.5, country: 'us', city: 'New York', postalCode: '10001' } });
  assert.match(r.data.result.text, /EXPRESS WORLDWIDE: NPR 7420/); assert.match(dhCalls.at(-1).path, /\/mydhlapi\/test\/rates\?.*destinationCountryCode=US/);
  const shipFields = { recipientName: 'John', recipientPhone: '+12125550100', recipientAddress: '1 Main St', recipientCity: 'New York', recipientPostalCode: '10001', country: 'US', weight: 1.5 };
  assert.equal((await c.act('dhl', 'create_shipment', { ...saleCtx, mode: 'test', fields: shipFields }, await pass({ iss: STRATEK, aud: 'conn-1', sub: 'merchant:1', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60, src: 'api_key' }))).error.code, 'APPROVAL_REQUIRED');
  r = await c.act('dhl', 'create_shipment', { ...saleCtx, mode: 'test', fields: shipFields });
  assert.equal(r.success, true, JSON.stringify(r));
  const sh = dhCalls.find((x) => x.path.endsWith('/shipments')).body;
  assert.equal(sh.customerDetails.shipperDetails.postalAddress.cityName, 'Lalitpur'); assert.equal(sh.content.exportDeclaration.lineItems[0].quantity.value, 2); assert.equal(sh.accounts[0].number, '950000002');
  res = await go(c.env, new URL(r.data.result.url).pathname);
  assert.equal(res.headers.get('content-type'), 'application/pdf'); assert.match(await res.text(), /%PDF/);
  assert.match((await c.act('dhl', 'track', { ...saleCtx, mode: 'test' })).data.result.text, /KATHMANDU/);
  const man = await c.manifest();
  for (const id of ['whatsapp', 'viber', 'woocommerce', 'shopify', 'quickbooks', 'xero', 'zoho_books', 'dhl']) assert.equal(man.find((i) => i.id === id).status, 'available', id);
});
