// Runs the connector in plain Node (npm test): pairing, pass checks, manifest, actions.
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

test('pairing, passes, manifest and actions', async () => {
  const env = makeEnv();
  assert.match(await (await go(env, '/')).text(), /Connect to Stratek/);
  const r1 = await go(env, '/connect');
  assert.equal(r1.status, 302);
  const state = new URL(r1.headers.get('location')).searchParams.get('state');
  assert.match(await (await go(env, `/connect/callback?code=${'a'.repeat(64)}&state=nope`)).text(), /no longer valid/);
  assert.match(await (await go(env, `/connect/callback?code=${'a'.repeat(64)}&state=${state}`)).text(), /All set/);
  assert.equal((await go(env, '/connect')).status, 409, 'cannot re-pair');

  const now = Math.floor(Date.now() / 1000);
  const good = await pass({ iss: STRATEK, aud: 'conn-1', sub: 'merchant:1', owner_name: 'Chyau', iat: now, exp: now + 3600 });
  const res = await go(env, '/manifest', { headers: { Authorization: `Bearer ${good}`, Origin: STRATEK } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), STRATEK);
  const m = await res.json();
  assert.ok(m.data.integrations.find((i) => i.id === 'core' && i.ready));

  const ping = await (await go(env, '/actions/core/ping', { method: 'POST', headers: { Authorization: `Bearer ${good}` }, body: '{}' })).json();
  assert.equal(ping.data.result.type, 'message');

  for (const [claims, status] of [
    [{ iss: STRATEK, aud: 'other', sub: 'merchant:1', exp: now + 60 }, 403],
    [{ iss: STRATEK, aud: 'conn-1', sub: 'merchant:2', exp: now + 60 }, 403],
    [{ iss: STRATEK, aud: 'conn-1', sub: 'merchant:1', exp: now - 1 }, 401],
    [{ iss: 'https://evil.test', aud: 'conn-1', sub: 'merchant:1', exp: now + 60 }, 401],
  ]) {
    assert.equal((await go(env, '/manifest', { headers: { Authorization: `Bearer ${await pass(claims)}` } })).status, status, JSON.stringify(claims));
  }
  assert.equal((await go(env, '/manifest', { headers: { Authorization: `Bearer ${good.slice(0, -3)}AAA` } })).status, 401, 'tampered');
  assert.equal((await go(env, '/manifest')).status, 401, 'no pass');

  assert.equal((await go(env, '/disconnect', { method: 'POST', headers: { Authorization: `Bearer ${good}` } })).status, 200);
  assert.match(await (await go(env, '/')).text(), /Connect to Stratek/);
});

test('auto-pairing after Stratek installs the connector', async () => {
  const env = makeEnv({ INSTALL_SECRET: 's3cret-install' });
  const auto = (body) => go(env, '/connect/auto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await auto({ code: 'a'.repeat(64), secret: 'wrong' })).status, 403, 'wrong install secret');
  assert.equal((await auto({ code: 'a'.repeat(64) })).status, 403, 'no install secret');
  assert.equal((await auto({ code: 'nope', secret: 's3cret-install' })).status, 400, 'bad code');
  assert.equal((await auto({ code: 'b'.repeat(64), secret: 's3cret-install' })).status, 502, 'Stratek rejects the code');
  const ok = await (await auto({ code: 'a'.repeat(64), secret: 's3cret-install' })).json();
  assert.equal(ok.data.connected, true);
  assert.equal(ok.data.ownerName, 'Chyau');
  assert.match(await (await go(env, '/')).text(), /Connected/);
  // Re-installing (an update) may pair again with the new install secret.
  assert.equal((await auto({ code: 'a'.repeat(64), secret: 's3cret-install' })).status, 200);
  // Without an INSTALL_SECRET binding the route is closed.
  const env2 = makeEnv();
  assert.equal((await go(env2, '/connect/auto', { method: 'POST', body: JSON.stringify({ code: 'a'.repeat(64), secret: '' }) })).status, 403);
});

test('Set up form: keys saved in the connector, masked, session passes only', async () => {
  const { INTEGRATIONS } = await import('../src/registry.js');
  let seen = null;
  INTEGRATIONS.push({
    id: 'demo', name: 'Demo', category: 'automation', status: 'available', description: 'test',
    secrets: [{ name: 'DEMO_KEY', label: 'Demo key' }, { name: 'DEMO_OPT', label: 'Optional', optional: true }],
    actions: [{ id: 'go', label: 'Go', placement: ['transaction'], fields: [], async run({ env }) { seen = env.DEMO_KEY; return { type: 'message', text: 'ok' }; } }],
  });
  const env = makeEnv({ INSTALL_SECRET: 'i' });
  await go(env, '/connect/auto', { method: 'POST', body: JSON.stringify({ code: 'a'.repeat(64), secret: 'i' }) });
  const now = Math.floor(Date.now() / 1000);
  const base = { iss: STRATEK, aud: 'conn-1', sub: 'merchant:1', iat: now, exp: now + 3600 };
  const session = await pass({ ...base, src: 'session', actor: 'bio@gmail.com' });
  const apiKey = await pass({ ...base, src: 'api_key' });
  const H = (t) => ({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });

  const page = await go(env, '/setup/demo');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /connect-src 'self'/);
  assert.match(await page.text(), /Set up Demo/);
  assert.equal((await go(env, '/setup/stripe')).status, 409, 'planned integration has no form yet');
  assert.equal((await go(env, '/setup/nope')).status, 404);

  let m = (await (await go(env, '/manifest', { headers: H(session) })).json()).data.integrations;
  const demo = m.find((i) => i.id === 'demo');
  assert.equal(demo.ready, false); assert.equal(demo.setup, true); assert.deepEqual(demo.missingSecrets, ['DEMO_KEY']);
  const stripe = m.find((i) => i.id === 'stripe');
  assert.equal(stripe.status, 'planned'); assert.equal(stripe.ready, false); assert.equal(stripe.setup, false); assert.equal(stripe.category, 'payments');
  assert.equal((await go(env, '/actions/demo/go', { method: 'POST', headers: H(session), body: '{}' })).status, 409, 'not ready');
  assert.equal((await go(env, '/actions/stripe/payment_link', { method: 'POST', headers: H(session), body: '{}' })).status, 409, 'planned');

  assert.equal((await go(env, '/secrets/demo', { method: 'POST', headers: H(apiKey), body: JSON.stringify({ values: { DEMO_KEY: 'x' } }) })).status, 403, 'API-key pass cannot set keys');
  assert.equal((await go(env, '/secrets/demo', { method: 'POST', headers: H(session), body: JSON.stringify({ values: { OTHER: 'x' } }) })).status, 400, 'unknown key name');
  assert.equal((await go(env, '/secrets/demo', { method: 'POST', headers: H(session), body: JSON.stringify({ values: { DEMO_KEY: 'x' } }) })).status, 200);
  const secret = 'sk_live_1234567890abcdefWXYZ';
  let r = await (await go(env, '/secrets/demo', { method: 'POST', headers: H(session), body: JSON.stringify({ values: { DEMO_KEY: secret } }) })).json();
  assert.equal(r.data.ready, true);
  assert.equal(r.data.secrets[0].masked, 'sk_…WXYZ');
  assert.ok(!JSON.stringify(r).includes(secret), 'full key never returned');
  r = await (await go(env, '/secrets/demo', { headers: H(apiKey) })).json();
  assert.equal(r.data.secrets[0].set, true, 'masked status readable with any pass');
  assert.ok(!JSON.stringify(r).includes(secret));
  m = (await (await go(env, '/manifest', { headers: H(session) })).json()).data.integrations;
  assert.equal(m.find((i) => i.id === 'demo').ready, true);
  assert.ok(!JSON.stringify(m).includes(secret), 'manifest never has values');
  assert.equal((await go(env, '/actions/demo/go', { method: 'POST', headers: H(session), body: '{}' })).status, 200);
  assert.equal(seen, secret, 'action gets the key as env.DEMO_KEY');

  // Browsers on the Stratek site may not call the key endpoints (no CORS).
  const cors = await go(env, '/secrets/demo', { headers: { ...H(session), Origin: STRATEK } });
  assert.equal(cors.headers.get('access-control-allow-origin'), null);

  // Cloudflare Secret used when nothing saved in the form; the form wins.
  const env2 = makeEnv({ INSTALL_SECRET: 'i', DEMO_KEY: 'from-cloudflare' });
  await go(env2, '/connect/auto', { method: 'POST', body: JSON.stringify({ code: 'a'.repeat(64), secret: 'i' }) });
  r = await (await go(env2, '/secrets/demo', { headers: H(session) })).json();
  assert.equal(r.data.secrets[0].source, 'cloudflare');
  // remove
  r = await (await go(env, '/secrets/demo', { method: 'POST', headers: H(session), body: JSON.stringify({ remove: ['DEMO_KEY'] }) })).json();
  assert.equal(r.data.ready, false);
  INTEGRATIONS.pop();
});

test('passes only unlock the integrations Stratek allowed for the shop (claim int)', async () => {
  const { INTEGRATIONS } = await import('../src/registry.js');
  INTEGRATIONS.push({
    id: 'demo2', name: 'Demo2', category: 'automation', status: 'available', description: 't',
    secrets: [{ name: 'D2_KEY', label: 'k' }],
    actions: [{ id: 'go', label: 'Go', placement: ['transaction'], fields: [], async run() { return { type: 'message', text: 'ok' }; } }],
  });
  const env = makeEnv({ INSTALL_SECRET: 'i', D2_KEY: 'x' });
  await go(env, '/connect/auto', { method: 'POST', body: JSON.stringify({ code: 'a'.repeat(64), secret: 'i' }) });
  const now = Math.floor(Date.now() / 1000);
  const base = { iss: STRATEK, aud: 'conn-1', sub: 'merchant:1', iat: now, exp: now + 3600, src: 'session' };
  const H = (t) => ({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });
  const limited = await pass({ ...base, int: ['pathao'] });
  const all = await pass({ ...base, int: '*' });
  const legacy = await pass(base);
  let m = (await (await go(env, '/manifest', { headers: H(limited) })).json()).data.integrations.map((i) => i.id);
  assert.deepEqual(m.sort(), ['core', 'pathao'], 'only core + allowed');
  assert.equal((await go(env, '/actions/demo2/go', { method: 'POST', headers: H(limited), body: '{}' })).status, 403);
  assert.equal((await go(env, '/secrets/demo2', { headers: H(limited) })).status, 403);
  assert.equal((await go(env, '/actions/core/ping', { method: 'POST', headers: H(limited), body: '{}' })).status, 200, 'core always works');
  assert.equal((await go(env, '/actions/demo2/go', { method: 'POST', headers: H(all), body: '{}' })).status, 200);
  assert.equal((await go(env, '/actions/demo2/go', { method: 'POST', headers: H(legacy), body: '{}' })).status, 200, 'old Stratek passes without the claim still work');
  m = (await (await go(env, '/manifest', { headers: H(all) })).json()).data.integrations;
  assert.ok(m.find((i) => i.id === 'slant3d' && i.category === 'fulfilment') && m.find((i) => i.id === 'meta_capi') && m.find((i) => i.id === 'coinbase'));
  INTEGRATIONS.pop();
});
