// Stratek connector -- runs in YOUR Cloudflare account and holds YOUR
// integration keys. The Stratek POS never sees those keys: it gives the
// browser a short-lived signed pass, and the browser calls this Worker
// directly. See CONNECTORS.md for the full contract.
//
// Routes
//   GET  /                     setup / status page
//   GET  /connect              start pairing -> Stratek approval page
//   GET  /connect/callback     finish pairing (Stratek sends you back here)
//   GET  /health               { ok, version, connected }
//   GET  /manifest             integrations + actions        (Stratek pass)
//   POST /actions/:int/:act    run an action                 (Stratek pass)
//   POST /disconnect           forget the pairing            (Stratek pass)

import { ConnectorState, store } from './state.js';
import { verifyPass, fetchStratekKey } from './auth.js';
import { manifest, findAction, isReady } from './registry.js';
import { homePage, messagePage, connectedPage } from './pages.js';
import { CONNECTOR_VERSION } from './version.js';

export { ConnectorState };

function stratekUrl(env) {
  return String(env.STRATEK_URL || 'https://strateknepal.com').replace(/\/+$/, '');
}

function cors(env, request) {
  const origin = request.headers.get('Origin');
  // Only the Stratek POS may call this connector from a browser.
  if (origin && origin === stratekUrl(env)) {
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
    // Server-to-server: prove the code with Stratek, get who we belong to.
    let data;
    try {
      const res = await fetch(`${base}/api/v1/connectors/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, url: url.origin, version: CONNECTOR_VERSION }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) throw new Error(body?.error?.message || `Stratek said no (${res.status}).`);
      data = body.data;
    } catch (err) {
      return messagePage('Could not connect', err.message, 'err', 502);
    }
    const stratekKey = await fetchStratekKey(base).catch(() => null);
    if (!stratekKey) return messagePage('Could not connect', "Couldn't load Stratek's public key. Try again in a minute.", 'err', 502);
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
    await db.delete('pending');
    return connectedPage(pairing, base);
  }

  // ── API for the Stratek POS (needs a Stratek pass) ────────
  const needsPass = pathname === '/manifest' || pathname === '/disconnect' || pathname.startsWith('/actions/');
  if (!needsPass) return failJson(env, request, 'Not found', 404, 'NOT_FOUND');

  const pairing = await db.get('pairing');
  const { claims, error, status } = await verifyPass(request, pairing, async (key) => db.put('pairing', { ...pairing, stratekKey: key }));
  if (error) return failJson(env, request, error, status, 'UNAUTHORIZED');

  if (pathname === '/manifest' && request.method === 'GET') {
    return okJson(env, request, {
      connector: { version: CONNECTOR_VERSION, connectorId: pairing.connectorId, owner: { type: pairing.ownerType, id: pairing.ownerId, name: pairing.ownerName } },
      integrations: manifest(env),
    });
  }

  if (pathname === '/disconnect' && request.method === 'POST') {
    await db.delete('pairing');
    return okJson(env, request, { disconnected: true });
  }

  const m = pathname.match(/^\/actions\/([a-z0-9_-]+)\/([a-z0-9_-]+)$/);
  if (m && request.method === 'POST') {
    const found = findAction(m[1], m[2]);
    if (!found) return failJson(env, request, 'Unknown integration or action.', 404, 'NOT_FOUND');
    if (!isReady(found.integration, env)) return failJson(env, request, `${found.integration.name} is not set up on this connector yet.`, 409, 'NOT_READY');
    const body = await request.json().catch(() => ({}));
    const fields = body && typeof body.fields === 'object' && body.fields ? body.fields : {};
    for (const f of found.action.fields || []) {
      if (f.required && (fields[f.name] === undefined || fields[f.name] === null || String(fields[f.name]).trim() === '')) {
        return failJson(env, request, `${f.label} is required.`, 400, 'MISSING_FIELD');
      }
    }
    try {
      const result = await found.action.run({ env, claims, fields, context: body?.context || {} });
      return okJson(env, request, { result });
    } catch (err) {
      console.error(`action ${m[1]}/${m[2]} failed:`, err);
      return failJson(env, request, err?.message || 'The integration failed.', 502, 'ACTION_FAILED');
    }
  }
  return failJson(env, request, 'Not found', 404, 'NOT_FOUND');
}

export default { fetch: (request, env) => handle(request, env) };
