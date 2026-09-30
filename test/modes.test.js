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
  if (u.host === 'graph.facebook.com') return Response.json({ events_received: 1 });
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
