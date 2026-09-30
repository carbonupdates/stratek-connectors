// OAuth 2.0 for integrations that need the owner to log in and allow access
// (QuickBooks, Xero, Zoho Books). The owner creates their OWN app with the
// provider (bring your own app), pastes its client ID / secret in Set up, and
// registers this redirect URI with the provider:
//     <connector>/oauth/<integration>/callback
// Then "Connect <name>" (Integrations tab, signed-in person only) opens
//     <connector>/oauth/<integration>/start/<mode>/<state>  -> provider login
// and the provider sends the owner back to /callback, where the code is swapped
// for tokens that stay in this connector (integration memory, per mode).
//
// An integration declares:
//   oauth: {
//     authorizeUrl(env, mode), tokenUrl(env, mode), scope(env),
//     clientId(env), clientSecret(env),
//     tokenAuth: 'basic' | 'body',              // how the client secret is sent
//     extraAuthParams?: { access_type: 'offline', ... },
//     afterConnect?({ tokens, query, env, mode, store }) -> extra fields to keep (e.g. realmId, tenantId)
//   }

const STATE_TTL = 15 * 60 * 1000;
const rnd = () => [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Used by the integration's "connect" action: a one-time link for the signed-in owner. */
export async function oauthStartLink({ db, integration, mode, origin }) {
  const state = rnd();
  await db.put(`oauth_state:${state}`, { id: integration.id, mode, exp: Date.now() + STATE_TTL });
  return `${origin}/oauth/${integration.id}/start/${mode}/${state}`;
}

export const redirectUri = (origin, id) => `${origin}/oauth/${id}/callback`;

/** GET /oauth/:int/start/:mode/:state -> 302 to the provider. */
export async function oauthStart({ db, integration, mode, state, env, origin }) {
  const s = await db.get(`oauth_state:${state}`);
  if (!s || s.id !== integration.id || s.mode !== mode || s.exp < Date.now()) throw new Error('This connect link has expired. Press "Connect" in Stratek again.');
  const o = integration.oauth;
  const u = new URL(o.authorizeUrl(env, mode));
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', o.clientId(env));
  u.searchParams.set('redirect_uri', redirectUri(origin, integration.id));
  u.searchParams.set('scope', o.scope(env));
  u.searchParams.set('state', state);
  for (const [k, v] of Object.entries(o.extraAuthParams || {})) u.searchParams.set(k, v);
  return Response.redirect(u.toString(), 302);
}

async function tokenRequest(integration, env, mode, params, origin) {
  const o = integration.oauth;
  const body = new URLSearchParams(params);
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
  if (o.tokenAuth === 'basic') headers.Authorization = `Basic ${btoa(`${o.clientId(env)}:${o.clientSecret(env)}`)}`;
  else { body.set('client_id', o.clientId(env)); body.set('client_secret', o.clientSecret(env)); }
  if (params.grant_type === 'authorization_code') body.set('redirect_uri', redirectUri(origin, integration.id));
  const res = await fetch(o.tokenUrl(env, mode), { method: 'POST', headers, body });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.access_token) throw new Error(`${integration.name} did not give a token (${j?.error_description || j?.error || res.status}). Check the client ID / secret and the redirect URI.`);
  return j;
}

/** GET /oauth/:int/callback?code&state -> tokens stored; returns { mode }. */
export async function oauthCallback({ db, integration, url, envFor, storeFor, origin }) {
  const state = url.searchParams.get('state') || '';
  const s = await db.get(`oauth_state:${state}`);
  if (!s || s.id !== integration.id || s.exp < Date.now()) throw new Error('This connect link has expired. Press "Connect" in Stratek again.');
  await db.delete(`oauth_state:${state}`);
  if (url.searchParams.get('error')) throw new Error(`${integration.name}: ${url.searchParams.get('error_description') || url.searchParams.get('error')}`);
  const code = url.searchParams.get('code');
  if (!code) throw new Error(`${integration.name} did not send a code back.`);
  const env = await envFor(s.mode);
  const store = storeFor(s.mode);
  const t = await tokenRequest(integration, env, s.mode, { grant_type: 'authorization_code', code }, origin);
  const query = Object.fromEntries(url.searchParams);
  const saved = { access_token: t.access_token, refresh_token: t.refresh_token || null, expires_at: Date.now() + (Number(t.expires_in) || 3600) * 1000, connectedAt: new Date().toISOString() };
  const extra = integration.oauth.afterConnect ? await integration.oauth.afterConnect({ tokens: saved, query, env, mode: s.mode, store }) : {};
  await store.put('oauth', { ...saved, ...(extra || {}) });
  return { mode: s.mode, extra };
}

/** A fresh access token (refreshes when needed). Throws if not connected. */
export async function accessToken(integration, env, store, mode, origin = '') {
  const t = await store.get('oauth');
  if (!t?.access_token) throw new Error(`${integration.name} is not connected yet. Press "Connect ${integration.name}" on the Integrations tab.`);
  if (t.expires_at > Date.now() + 60000) return t;
  if (!t.refresh_token) throw new Error(`${integration.name} needs connecting again (the access expired).`);
  let n;
  try { n = await tokenRequest(integration, env, mode, { grant_type: 'refresh_token', refresh_token: t.refresh_token }, origin); }
  catch { throw new Error(`${integration.name} needs connecting again (the saved login was refused). Press "Connect ${integration.name}".`); }
  const next = { ...t, access_token: n.access_token, refresh_token: n.refresh_token || t.refresh_token, expires_at: Date.now() + (Number(n.expires_in) || 3600) * 1000 };
  await store.put('oauth', next);
  return next;
}

export async function oauthStatus(store) {
  const t = await store.get('oauth');
  return t?.access_token ? { connected: true, since: t.connectedAt } : { connected: false };
}
