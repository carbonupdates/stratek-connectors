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
