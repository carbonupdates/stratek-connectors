// Stratek connector -- runs in YOUR Cloudflare account and holds YOUR
// integration keys. The Stratek POS never sees those keys: it gives the
// browser a short-lived signed pass, and the browser calls this Worker
// directly. See CONNECTORS.md for the full contract.
//
// Routes
//   GET  /                     setup / status page
//   GET  /connect              start pairing -> Stratek approval page
//   GET  /connect/callback     finish pairing (Stratek sends you back here)
//   POST /connect/auto         pairing right after Stratek installed this
//                              connector (needs the INSTALL_SECRET it set)
//   GET  /health               { ok, version, connected }
//   GET  /manifest             integrations + actions        (Stratek pass)
//   POST /actions/:int/:act    run an action                 (Stratek pass)
//   POST /disconnect           forget the pairing            (Stratek pass)
//   GET  /setup/:int           "Set up" page for an integration's keys
//                              (opened from Stratek with the pass in #fragment)
//   GET  /secrets/:int         which keys are set (masked)   (Stratek pass)
//   POST /secrets/:int         save / remove keys            (Stratek pass,
//                              signed-in session only, not API keys)
//   GET  /event-key            public key Stratek checks this connector's events with
//   GET  /pay/:int/start/:mode/:token   hosted payment start page (eSewa, connectIPS form post)
//   GET|POST /pay/:int/return/:mode     gateway return; checked, then a signed payment.succeeded event
//   GET  /oauth/:int/start/:mode/:state  OAuth login for QuickBooks / Xero / Zoho Books (owner's own app)
//   GET  /oauth/:int/callback            OAuth return; tokens stay in this connector
//   POST /webhooks/:int[/test] notifications from a provider (e.g. PayBridgeNP
//                              "payment succeeded"); checked by the integration,
//                              then forwarded to Stratek as a signed event.
//                              /webhooks/telegram: messages to the shop's bot (v0.13.0)
//
// Test vs live: every integration has two key sets (Set up page sections).
// Actions/secrets take `mode: 'test' | 'live'` (default live); webhooks for
// test keys arrive at /webhooks/:int/test. Test keys are stored separately
// ('secrets_test') and each mode has its own integration memory.

import { ConnectorState, store } from './state.js';
import { verifyPass, fetchStratekKey } from './auth.js';
import { INTEGRATIONS, isOutbound, manifest, findAction, findIntegration, isReady, statusOf, requiredSecrets, allSecretNames, secretsFor, testInfo, modeOf } from './registry.js';
import { homePage, messagePage, connectedPage, setupPage } from './pages.js';
import { matchStorefront, serveStorefront, cleanStorefront } from './storefront.js';
import { CONNECTOR_VERSION } from './version.js';
import { publicEventKey, emitEvent, keyPair } from './events.js';
import { oauthStartLink, oauthStart, oauthCallback } from './integrations/_oauth.js';

export { ConnectorState };

function stratekUrl(env) {
  return String(env.STRATEK_URL || 'https://strateknepal.com').replace(/\/+$/, '');
}

function cors(env, request) {
  const origin = request.headers.get('Origin');
  // Only the Stratek POS may call this connector from a browser -- and never
  // the key endpoints (/secrets/*): keys are entered on this connector's own
  // Set up page, so Stratek's pages can't send or read them.
  if (origin && origin === stratekUrl(env) && !new URL(request.url).pathname.startsWith('/secrets/')) {
    return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '600', Vary: 'Origin' };
  }
  return { Vary: 'Origin' };
}

function json(env, request, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(env, request) } });
}
const okJson = (env, req, data) => json(env, req, { success: true, data });
const failJson = (env, req, message, status = 400, code = 'BAD_REQUEST') => json(env, req, { success: false, error: { message, code } }, status);

function randomHex(bytes = 24) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const MAX_KEY_LENGTH = 4096;

/**
 * All integration keys for one mode: saved with the Set up form (Durable
 * Object; live in 'secrets', test in 'secrets_test') or set as Cloudflare
 * Secrets with the same name (test: prefixed TEST_). The Set up form wins.
 * Returns { keys, source } where source[name] = 'connector' | 'cloudflare'.
 */
async function loadKeys(env, db, mode = 'live') {
  await migrateKeys(db);
  const test = modeOf(mode) === 'test';
  const stored = (await db.get(test ? 'secrets_test' : 'secrets')) || {};
  const keys = {};
  const source = {};
  for (const name of allSecretNames()) {
    const envName = test ? `TEST_${name}` : name;
    if (typeof stored[name] === 'string' && stored[name]) { keys[name] = stored[name]; source[name] = 'connector'; }
    else if (typeof env[envName] === 'string' && env[envName].trim()) { keys[name] = env[envName]; source[name] = 'cloudflare'; }
  }
  return { keys, source };
}

/** Per-integration memory, separate for test and live. */
function integrationStore(db, integration, mode = 'live') {
  const prefix = modeOf(mode) === 'test' ? `data:${integration.id}:test:` : `data:${integration.id}:`;
  return { get: (k) => db.get(prefix + k), put: (k, v) => db.put(prefix + k, v), delete: (k) => db.delete(prefix + k) };
}

const TEST_VALUE = /^(sk|pk|rk)_test_/;
/**
 * One-time (v0.8.0): before test/live keys existed, some shops saved test
 * keys as their only keys. Move an integration's saved keys to "test" when
 * they are clearly test keys (sk_test_..., PayPal "sandbox" mode, a Meta test
 * event code) and none look live.
 */
async function migrateKeys(db) {
  if (await db.get('keys_v2')) return;
  const live = (await db.get('secrets')) || {};
  const test = (await db.get('secrets_test')) || {};
  const moved = [];
  for (const i of INTEGRATIONS) {
    if (testInfo(i).support === 'none') continue;
    const names = [...new Set([...secretsFor(i, 'live'), ...secretsFor(i, 'test')].map((x) => x.name))].filter((n) => typeof live[n] === 'string' && live[n]);
    if (!names.length) continue;
    const vals = names.map((n) => live[n]);
    const looksTest = vals.some((v) => TEST_VALUE.test(v))
      || (i.id === 'paypal' && String(live.PAYPAL_MODE || '').toLowerCase() === 'sandbox')
      || (i.id === 'meta_capi' && !!live.META_TEST_EVENT_CODE);
    const looksLive = vals.some((v) => /^(sk|pk|rk)_live_/.test(v));
    if (!looksTest || looksLive) continue;
    for (const n of names) { test[n] = live[n]; delete live[n]; }
    if (i.id === 'paypal') { delete test.PAYPAL_MODE; delete live.PAYPAL_MODE; }
    const hook = await db.get(`data:${i.id}:webhook`);
    if (hook) { await db.put(`data:${i.id}:test:webhook`, { ...hook, legacyUrl: true }); await db.delete(`data:${i.id}:webhook`); }
    moved.push(i.id);
  }
  await db.put('secrets', live);
  await db.put('secrets_test', test);
  await db.put('keys_v2', { at: new Date().toISOString(), moved });
  if (moved.length) console.log(`keys moved to test: ${moved.join(', ')}`);
}

function mask(v) {
  const s = String(v);
  return s.length >= 16 ? `${s.slice(0, 3)}…${s.slice(-4)}` : '••••••';
}

function secretsView(integration, keys, source, mode = 'live') {
  const m = modeOf(mode);
  const missing = requiredSecrets(integration, m).filter((s) => !keys[s.name]).map((s) => s.label);
  const t = testInfo(integration);
  return {
    id: integration.id,
    name: integration.name,
    mode: m,
    ready: isReady(integration, keys, m),
    missing,
    test: { support: t.support, note: t.note || null },
    secrets: secretsFor(integration, m).map((s) => ({
      name: s.name, label: s.label, hint: s.hint || null, optional: !!s.optional,
      set: !!keys[s.name], masked: keys[s.name] ? mask(keys[s.name]) : null, source: source[s.name] || null,
    })),
  };
}

/** Constant-time comparison of two secrets (via their SHA-256 digests). */
async function sameSecret(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([a, b].map(async (v) => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(v)))));
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0 && a.length > 0;
}

/** Server-to-server: prove a one-time code with Stratek, then remember who we belong to. */
async function pairWithStratek(db, base, code, origin) {
  const res = await fetch(`${base}/api/v1/connectors/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, url: origin, version: CONNECTOR_VERSION }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) throw new Error(body?.error?.message || `Stratek said no (${res.status}).`);
  const data = body.data;
  const stratekKey = await fetchStratekKey(base).catch(() => null);
  if (!stratekKey) throw new Error("Couldn't load Stratek's public key. Try again in a minute.");
  const pairing = {
    connectorId: data.connectorId,
    ownerType: data.ownerType,
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    stratekUrl: base,
    stratekKey,
    connectedAt: new Date().toISOString(),
  };
  await db.put('pairing', pairing);
  return pairing;
}

export async function handle(request, env) {
  const url = new URL(request.url);
  const { pathname } = url;
  const db = store(env);
  const base = stratekUrl(env);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env, request) });

  // ── Storefront (v0.11.0): the shop's online store on its own domain / workers.dev/shop ──
  const sf = matchStorefront(await db.get('storefront'), url);
  if (sf) return serveStorefront(request, { db, pairing: await db.get('pairing'), stratekUrl: base, match: sf, keyPair });

  // ── Pages & pairing ───────────────────────────────────────
  if (pathname === '/' && request.method === 'GET') {
    return homePage({ pairing: await db.get('pairing'), version: CONNECTOR_VERSION, stratekUrl: base });
  }
  if (pathname === '/event-key' && request.method === 'GET') {
    return okJson(env, request, await publicEventKey(db));
  }

  // Provider notifications (no Stratek pass -- each integration checks the provider's own signature).
  const hookMatch = pathname.match(/^\/webhooks\/([a-z0-9_-]+)(\/test)?$/);
  if (hookMatch && request.method === 'POST') {
    const integration = findIntegration(hookMatch[1]);
    if (!integration?.webhook || statusOf(integration) !== 'available') return failJson(env, request, 'Not found', 404, 'NOT_FOUND');
    const rawBody = await request.text();
    if (rawBody.length > 256 * 1024) return failJson(env, request, 'Too large.', 413, 'TOO_LARGE');
    let mode = hookMatch[2] ? 'test' : 'live';
    await migrateKeys(db);
    // Registered before v0.8.0 with test keys at the old (live) address.
    if (mode === 'live' && !(await integrationStore(db, integration, 'live').get('webhook')) && (await integrationStore(db, integration, 'test').get('webhook'))?.legacyUrl) mode = 'test';
    const { keys } = await loadKeys(env, db, mode);
    const store = integrationStore(db, integration, mode);
    try {
      const storeFor = (id) => integrationStore(db, findIntegration(id), mode); // e.g. Telegram hands messages to the AI employee
      const out = await integration.webhook({ request, rawBody, env: { ...env, ...keys, STRATEK_MODE: mode }, store, mode, storeFor, emit: (event) => emitEvent(db, { ...event, mode }) });
      if (out instanceof Response) return out; // e.g. Pathao needs 202 + its own header
      return okJson(env, request, out || { received: true });
    } catch (err) {
      console.error(`webhook ${integration.id}:`, err?.message);
      return failJson(env, request, err?.message || 'Webhook failed.', err?.status || 400, 'WEBHOOK_REJECTED');
    }
  }

  // Hosted payment pages (v0.15.0): the customer scans a short link to this connector,
  //   GET /pay/:int/start/:mode/:token   -> the integration's page (e.g. an auto-submitting form to eSewa)
  //   GET|POST /pay/:int/return/:mode    -> the gateway sends the customer back; the integration checks
  //                                         the payment with the gateway and tells Stratek (signed event)
  const payMatch = pathname.match(/^\/pay\/([a-z0-9_]+)\/(start|return)\/(live|test)(?:\/([A-Za-z0-9_-]{16,64}))?$/);
  if (payMatch && (request.method === 'GET' || (payMatch[2] === 'return' && request.method === 'POST'))) {
    const integration = findIntegration(payMatch[1]);
    const hook = payMatch[2] === 'start' ? integration?.payPage : integration?.payReturn;
    if (!integration || !hook || statusOf(integration) !== 'available') return messagePage('Not found', 'This payment link is not valid.', 'err', 404);
    const mode = payMatch[3];
    const { keys } = await loadKeys(env, db, mode);
    if (!isReady(integration, keys, mode)) return messagePage('Not available', `${integration.name} is not set up on this shop's connector.`, 'err', 409);
    const store = integrationStore(db, integration, mode);
    const form = request.method === 'POST' ? Object.fromEntries(new URLSearchParams(await request.text())) : {};
    try {
      return await hook({ request, url, form, token: payMatch[4] || null, env: { ...env, ...keys, STRATEK_MODE: mode }, store, mode, origin: url.origin, emit: (event) => emitEvent(db, { ...event, mode }) });
    } catch (err) {
      console.error(`pay ${integration.id}:`, err?.message);
      return messagePage('Payment problem', err?.message || 'Something went wrong. Please show this screen to the shop.', 'err', 400);
    }
  }

  // OAuth (v0.17.0: QuickBooks, Xero, Zoho Books -- the owner's own app).
  //   GET /oauth/:int/start/:mode/:state   one-time link from the "Connect" button -> provider login
  //   GET /oauth/:int/callback             provider sends the owner back; tokens stay here
  const oauthMatch = pathname.match(/^\/oauth\/([a-z0-9_]+)\/(?:start\/(live|test)\/([0-9a-f]{48})|(callback))$/);
  if (oauthMatch && request.method === 'GET') {
    const integration = findIntegration(oauthMatch[1]);
    if (!integration?.oauth || statusOf(integration) !== 'available') return messagePage('Not found', 'This link is not valid.', 'err', 404);
    try {
      if (oauthMatch[2]) {
        const { keys } = await loadKeys(env, db, oauthMatch[2]);
        return await oauthStart({ db, integration, mode: oauthMatch[2], state: oauthMatch[3], env: { ...env, ...keys }, origin: url.origin });
      }
      const r = await oauthCallback({ db, integration, url, origin: url.origin,
        envFor: async (mode) => ({ ...env, ...(await loadKeys(env, db, mode)).keys }),
        storeFor: (mode) => integrationStore(db, integration, mode) });
      return messagePage(`${integration.name} is connected`, `Done${r.mode === 'test' ? ' (test keys)' : ''}. You can close this page and go back to Stratek.`, 'ok', 200);
    } catch (err) {
      return messagePage(`Could not connect ${integration.name}`, err?.message || 'Something went wrong.', 'err', 400);
    }
  }

  // Where online payment pages send the customer back to.
  if (pathname === '/paid' && request.method === 'GET') {
    return messagePage('Thank you', 'Your payment was submitted. Please show this screen to the shop -- they will confirm it on their side.', 'ok', 200);
  }
  if (pathname === '/health' && request.method === 'GET') {
    return okJson(env, request, { ok: true, version: CONNECTOR_VERSION, connected: !!(await db.get('pairing')) });
  }

  if (pathname === '/connect' && request.method === 'GET') {
    const pairing = await db.get('pairing');
    // Once connected, nobody can re-pair this connector to another account
    // from the outside. Disconnect from Stratek first, or set the variable
    // ALLOW_REPAIR=true in the Cloudflare dashboard.
    if (pairing && env.ALLOW_REPAIR !== 'true') {
      return messagePage('Already connected', `This connector already belongs to ${pairing.ownerName || pairing.ownerType}. To move it, press Disconnect on Stratek's Integrations tab first.`, 'err', 409);
    }
    const state = randomHex();
    await db.put('pending', { state, createdAt: Date.now() });
    const target = new URL(`${base}/connect.html`);
    target.searchParams.set('connector', url.origin);
    target.searchParams.set('state', state);
    return Response.redirect(target.toString(), 302);
  }

  if (pathname === '/connect/callback' && request.method === 'GET') {
    const code = url.searchParams.get('code') || '';
    const state = url.searchParams.get('state') || '';
    const pending = await db.get('pending');
    if (!pending || pending.state !== state || Date.now() - pending.createdAt > 15 * 60 * 1000) {
      return messagePage('Link expired', 'This connection link is no longer valid. Open the connector again and press Connect to Stratek.');
    }
    if (!/^[0-9a-f]{64}$/.test(code)) return messagePage('Something went wrong', 'Stratek did not send a valid code. Try connecting again.');
    let pairing;
    try {
      pairing = await pairWithStratek(db, base, code, url.origin);
    } catch (err) {
      return messagePage('Could not connect', err.message, 'err', 502);
    }
    await db.delete('pending');
    return connectedPage(pairing, base);
  }

  // Stratek installed this connector through the Cloudflare API and set a
  // one-off INSTALL_SECRET with it; knowing that secret proves the caller
  // just deployed this very Worker, so it may (re)pair it.
  if (pathname === '/connect/auto' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    const code = String(body?.code || '');
    if (!env.INSTALL_SECRET || !(await sameSecret(String(body?.secret || ''), env.INSTALL_SECRET))) {
      return failJson(env, request, 'Not allowed.', 403, 'FORBIDDEN');
    }
    if (!/^[0-9a-f]{64}$/.test(code)) return failJson(env, request, 'Invalid pairing code.');
    try {
      const pairing = await pairWithStratek(db, base, code, url.origin);
      await db.delete('pending');
      return okJson(env, request, { connected: true, ownerName: pairing.ownerName, version: CONNECTOR_VERSION });
    } catch (err) {
      return failJson(env, request, err.message, 502, 'PAIR_FAILED');
    }
  }

  const setupMatch = pathname.match(/^\/setup\/([a-z0-9_-]+)$/);
  if (setupMatch && request.method === 'GET') {
    const integration = findIntegration(setupMatch[1]);
    if (!integration || !(integration.secrets || []).length) return messagePage('Not found', 'There is no such integration on this connector.', 'err', 404);
    if (statusOf(integration) !== 'available') return messagePage('Coming soon', `${integration.name} is not available in this connector version yet.`, 'err', 409);
    return setupPage(integration, url.origin);
  }

  // ── API for the Stratek POS (needs a Stratek pass) ────────
  const needsPass = pathname === '/manifest' || pathname === '/disconnect' || pathname === '/storefront' || pathname === '/agent-key' || pathname.startsWith('/actions/') || pathname.startsWith('/secrets/');
  if (!needsPass) return failJson(env, request, 'Not found', 404, 'NOT_FOUND');

  const pairing = await db.get('pairing');
  const { claims, error, status } = await verifyPass(request, pairing, async (key) => db.put('pairing', { ...pairing, stratekKey: key }));
  if (error) return failJson(env, request, error, status, 'UNAUTHORIZED');

  // Which integrations this pass may use: Stratek's admins decide per shop
  // (claim `int`: '*' or a list of ids). 'core' is always allowed; passes from
  // older Stratek versions without the claim may use everything.
  const allowedInt = (id) => id === 'core' || claims.int === undefined || claims.int === '*' || (Array.isArray(claims.int) && claims.int.includes(id));
  const notOffered = (name) => failJson(env, request, `${name} is not available for your shop. Ask Stratek.`, 403, 'NOT_OFFERED');

  if (pathname === '/manifest' && request.method === 'GET') {
    return okJson(env, request, {
      connector: { version: CONNECTOR_VERSION, connectorId: pairing.connectorId, owner: { type: pairing.ownerType, id: pairing.ownerId, name: pairing.ownerName } },
      integrations: manifest((await loadKeys(env, db)).keys, (await loadKeys(env, db, 'test')).keys).filter((i) => allowedInt(i.id)),
    });
  }

  // AI employee identity (v0.12.0): Stratek gives it when the owner switches the
  // AI employee on, and takes it away when switched off. Never shown anywhere.
  if (pathname === '/agent-key' && request.method === 'POST') {
    if (claims.src !== 'session' && claims.src !== 'server') return failJson(env, request, 'Only Stratek can do this.', 403, 'FORBIDDEN');
    const body = await request.json().catch(() => null);
    const aiStore = integrationStore(db, findIntegration('ai_employee'), 'live');
    if (body?.off) { await aiStore.delete('agent_key'); await aiStore.delete('tools'); return okJson(env, request, { linked: false }); }
    if (!/^stk_m_[0-9a-f]{64}$/.test(String(body?.key || ''))) return failJson(env, request, 'Bad key.', 400, 'BAD_KEY');
    await aiStore.put('agent_key', { key: body.key, at: new Date().toISOString() });
    await aiStore.delete('tools');
    return okJson(env, request, { linked: true });
  }

  // Storefront config: set by Stratek (a signed-in person, or Stratek's server acting for them).
  if (pathname === '/storefront') {
    if (request.method === 'GET') return okJson(env, request, (await db.get('storefront')) || null);
    if (request.method === 'POST') {
      if (claims.src !== 'session' && claims.src !== 'server') return failJson(env, request, 'Only Stratek can change the storefront.', 403, 'FORBIDDEN');
      const body = await request.json().catch(() => null);
      if (body?.off) { await db.delete('storefront'); return okJson(env, request, null); }
      let cfg;
      try { cfg = cleanStorefront(body); } catch (err) { return failJson(env, request, err.message, err.status || 400, 'BAD_STOREFRONT'); }
      await db.put('storefront', cfg);
      return okJson(env, request, cfg);
    }
  }

  const secretsMatch = pathname.match(/^\/secrets\/([a-z0-9_-]+)$/);
  if (secretsMatch) {
    const integration = findIntegration(secretsMatch[1]);
    if (!integration || !(integration.secrets || []).length) return failJson(env, request, 'Unknown integration.', 404, 'NOT_FOUND');
    if (!allowedInt(integration.id)) return notOffered(integration.name);
    if (statusOf(integration) !== 'available') return failJson(env, request, `${integration.name} is coming soon -- not in this connector version yet.`, 409, 'NOT_AVAILABLE');
    if (request.method === 'GET') {
      const mode = modeOf(url.searchParams.get('mode'));
      const { keys, source } = await loadKeys(env, db, mode);
      return okJson(env, request, secretsView(integration, keys, source, mode));
    }
    if (request.method === 'POST') {
      // Keys may only be changed by a person signed in to Stratek, never with an API key.
      if (claims.src !== 'session') return failJson(env, request, 'Keys can only be changed by someone signed in to Stratek (not with an API key).', 403, 'FORBIDDEN');
      const body = await request.json().catch(() => null);
      const mode = modeOf(body?.mode);
      if (mode === 'test' && testInfo(integration).support === 'none') return failJson(env, request, `${integration.name} has no test environment -- live keys only.`, 400, 'NO_TEST_MODE');
      const allowed = new Set(secretsFor(integration, mode).map((s) => s.name));
      const values = body && typeof body.values === 'object' && body.values ? body.values : {};
      const remove = Array.isArray(body?.remove) ? body.remove : [];
      await migrateKeys(db);
      const slot = mode === 'test' ? 'secrets_test' : 'secrets';
      const stored = (await db.get(slot)) || {};
      for (const [name, value] of Object.entries(values)) {
        if (!allowed.has(name)) return failJson(env, request, `${name} is not a key of ${integration.name}.`, 400, 'BAD_KEY');
        const v = String(value ?? '').trim();
        if (!v) continue;
        if (v.length > MAX_KEY_LENGTH) return failJson(env, request, 'That key is too long.', 400, 'BAD_KEY');
        stored[name] = v;
      }
      for (const name of remove) {
        if (!allowed.has(name)) return failJson(env, request, `${name} is not a key of ${integration.name}.`, 400, 'BAD_KEY');
        if (!(name in values)) delete stored[name];
      }
      await db.put(slot, stored);
      console.log(`${mode} keys updated for ${integration.id} by ${claims.actor || claims.sub}`); // names only, never values
      const { keys, source } = await loadKeys(env, db, mode);
      const view = secretsView(integration, keys, source, mode);
      // Some integrations finish their own setup once the keys are in (e.g. PayBridgeNP
      // registers this connector for payment notifications).
      if (view.ready && integration.onKeysSaved) {
        const store = integrationStore(db, integration, mode);
        try { view.notice = await integration.onKeysSaved({ env: { ...env, ...keys, STRATEK_MODE: mode }, store, origin: url.origin, mode }); }
        catch (err) { view.warning = err?.message || 'Setup step failed.'; }
      }
      return okJson(env, request, view);
    }
    return failJson(env, request, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  if (pathname === '/disconnect' && request.method === 'POST') {
    await db.delete('pairing');
    return okJson(env, request, { disconnected: true });
  }

  const m = pathname.match(/^\/actions\/([a-z0-9_-]+)\/([a-z0-9_-]+)$/);
  if (m && request.method === 'POST') {
    const found = findAction(m[1], m[2]);
    if (!found) return failJson(env, request, 'Unknown integration or action.', 404, 'NOT_FOUND');
    if (!allowedInt(found.integration.id)) return notOffered(found.integration.name);
    if (statusOf(found.integration) !== 'available') return failJson(env, request, `${found.integration.name} is coming soon.`, 409, 'NOT_AVAILABLE');
    // Outbound money actions are never run for an API key / AI agent -- a person
    // approves them in Stratek, which then runs them with a server pass.
    if (isOutbound(found.action) && claims.src === 'api_key') {
      return failJson(env, request, `${found.action.label} moves money out of the shop, so an AI agent or API key can't run it directly. Ask for approval in Stratek (request_integration_action); a person approves it in the dashboard.`, 403, 'APPROVAL_REQUIRED');
    }
    const body = await request.json().catch(() => ({}));
    const mode = modeOf(body?.mode);
    if (mode === 'test' && testInfo(found.integration).support === 'none') return failJson(env, request, `${found.integration.name} has no test environment -- live only.`, 409, 'NO_TEST_MODE');
    const { keys } = await loadKeys(env, db, mode);
    if (!isReady(found.integration, keys, mode)) return failJson(env, request, `${found.integration.name} ${mode === 'test' ? 'test keys are' : 'is'} not set up yet -- press Set up in Stratek.`, 409, 'NOT_READY');
    const fields = body && typeof body.fields === 'object' && body.fields ? body.fields : {};
    for (const f of found.action.fields || []) {
      if (f.required && (fields[f.name] === undefined || fields[f.name] === null || String(fields[f.name]).trim() === '')) {
        return failJson(env, request, `${f.label} is required.`, 400, 'MISSING_FIELD');
      }
    }
    try {
      // Integrations read their keys from env as usual; Set up form keys are merged in.
      // `store`: a small per-integration memory (e.g. which payment session belongs to which sale).
      const store = integrationStore(db, found.integration, mode);
      const result = await found.action.run({ env: { ...env, ...keys, STRATEK_MODE: mode }, claims, fields, context: body?.context || {}, origin: url.origin, store, mode, emit: (event) => emitEvent(db, { ...event, mode }), oauthLink: () => oauthStartLink({ db, integration: found.integration, mode, origin: url.origin }) });
      if (result && typeof result === 'object' && mode === 'test') result.testMode = true;
      return okJson(env, request, { result });
    } catch (err) {
      console.error(`action ${m[1]}/${m[2]} failed:`, err);
      return failJson(env, request, err?.message || 'The integration failed.', 502, 'ACTION_FAILED');
    }
  }
  return failJson(env, request, 'Not found', 404, 'NOT_FOUND');
}

export default { fetch: (request, env) => handle(request, env) };
