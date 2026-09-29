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

import { ConnectorState, store } from './state.js';
import { verifyPass, fetchStratekKey } from './auth.js';
import { manifest, findAction, findIntegration, isReady, statusOf, requiredSecrets, allSecretNames } from './registry.js';
import { homePage, messagePage, connectedPage, setupPage } from './pages.js';
import { CONNECTOR_VERSION } from './version.js';

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
 * All integration keys: saved with the Set up form (Durable Object) or set as
 * Cloudflare Secrets with the same name. The Set up form wins.
 * Returns { keys, source } where source[name] = 'connector' | 'cloudflare'.
 */
async function loadKeys(env, db) {
  const stored = (await db.get('secrets')) || {};
  const keys = {};
  const source = {};
  for (const name of allSecretNames()) {
    if (typeof stored[name] === 'string' && stored[name]) { keys[name] = stored[name]; source[name] = 'connector'; }
    else if (typeof env[name] === 'string' && env[name].trim()) { keys[name] = env[name]; source[name] = 'cloudflare'; }
  }
  return { keys, source };
}

function mask(v) {
  const s = String(v);
  return s.length >= 16 ? `${s.slice(0, 3)}…${s.slice(-4)}` : '••••••';
}

function secretsView(integration, keys, source) {
  const missing = requiredSecrets(integration).filter((s) => !keys[s.name]).map((s) => s.label);
  return {
    id: integration.id,
    name: integration.name,
    ready: isReady(integration, keys),
    missing,
    secrets: (integration.secrets || []).map((s) => ({
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

  // ── Pages & pairing ───────────────────────────────────────
  if (pathname === '/' && request.method === 'GET') {
    return homePage({ pairing: await db.get('pairing'), version: CONNECTOR_VERSION, stratekUrl: base });
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
    return setupPage(integration);
  }

  // ── API for the Stratek POS (needs a Stratek pass) ────────
  const needsPass = pathname === '/manifest' || pathname === '/disconnect' || pathname.startsWith('/actions/') || pathname.startsWith('/secrets/');
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
      integrations: manifest((await loadKeys(env, db)).keys).filter((i) => allowedInt(i.id)),
    });
  }

  const secretsMatch = pathname.match(/^\/secrets\/([a-z0-9_-]+)$/);
  if (secretsMatch) {
    const integration = findIntegration(secretsMatch[1]);
    if (!integration || !(integration.secrets || []).length) return failJson(env, request, 'Unknown integration.', 404, 'NOT_FOUND');
    if (!allowedInt(integration.id)) return notOffered(integration.name);
    if (statusOf(integration) !== 'available') return failJson(env, request, `${integration.name} is coming soon -- not in this connector version yet.`, 409, 'NOT_AVAILABLE');
    if (request.method === 'GET') {
      const { keys, source } = await loadKeys(env, db);
      return okJson(env, request, secretsView(integration, keys, source));
    }
    if (request.method === 'POST') {
      // Keys may only be changed by a person signed in to Stratek, never with an API key.
      if (claims.src !== 'session') return failJson(env, request, 'Keys can only be changed by someone signed in to Stratek (not with an API key).', 403, 'FORBIDDEN');
      const body = await request.json().catch(() => null);
      const allowed = new Set(integration.secrets.map((s) => s.name));
      const values = body && typeof body.values === 'object' && body.values ? body.values : {};
      const remove = Array.isArray(body?.remove) ? body.remove : [];
      const stored = (await db.get('secrets')) || {};
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
      await db.put('secrets', stored);
      console.log(`keys updated for ${integration.id} by ${claims.actor || claims.sub}`); // names only, never values
      const { keys, source } = await loadKeys(env, db);
      return okJson(env, request, secretsView(integration, keys, source));
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
    const { keys } = await loadKeys(env, db);
    if (!isReady(found.integration, keys)) return failJson(env, request, `${found.integration.name} is not set up yet -- press Set up in Stratek.`, 409, 'NOT_READY');
    const body = await request.json().catch(() => ({}));
    const fields = body && typeof body.fields === 'object' && body.fields ? body.fields : {};
    for (const f of found.action.fields || []) {
      if (f.required && (fields[f.name] === undefined || fields[f.name] === null || String(fields[f.name]).trim() === '')) {
        return failJson(env, request, `${f.label} is required.`, 400, 'MISSING_FIELD');
      }
    }
    try {
      // Integrations read their keys from env as usual; Set up form keys are merged in.
      const result = await found.action.run({ env: { ...env, ...keys }, claims, fields, context: body?.context || {} });
      return okJson(env, request, { result });
    } catch (err) {
      console.error(`action ${m[1]}/${m[2]} failed:`, err);
      return failJson(env, request, err?.message || 'The integration failed.', 502, 'ACTION_FAILED');
    }
  }
  return failJson(env, request, 'Not found', 404, 'NOT_FOUND');
}

export default { fetch: (request, env) => handle(request, env) };
