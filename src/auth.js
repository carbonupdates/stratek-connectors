// auth.js -- checks the one-hour pass the Stratek POS gives the browser.
//
// A pass is a JWT signed by Stratek with its Ed25519 signing key (EdDSA).
// The connector only knows Stratek's PUBLIC key (fetched at pairing from
// <STRATEK_URL>/api/v1/connectors/public-key), which can verify passes but
// never create them. A pass is accepted only if:
//   - the signature checks out,
//   - it was issued by the Stratek this connector is paired with,
//   - it is addressed to THIS connector (aud = connector id),
//   - it is for the account this connector belongs to (sub),
//   - it has not expired.

const enc = new TextEncoder();

function b64urlToBytes(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function b64urlJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

export async function fetchStratekKey(stratekUrl) {
  const res = await fetch(`${stratekUrl}/api/v1/connectors/public-key`, { headers: { Accept: 'application/json' } });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error?.message || `Could not load Stratek's public key (${res.status}).`);
  return json.data; // { issuer, kid, alg, jwk: { kty, crv, x } }
}

async function verifySignature(jwk, signingInput, signature) {
  const key = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: jwk.x }, { name: 'Ed25519' }, false, ['verify']);
  return crypto.subtle.verify({ name: 'Ed25519' }, key, signature, enc.encode(signingInput));
}

/**
 * Returns { claims } for a valid pass, or { error, status }.
 * `pairing` is the stored pairing; `saveKey(key)` updates the cached public key
 * when Stratek has rotated it (kid changed).
 */
export async function verifyPass(request, pairing, saveKey) {
  if (!pairing) return { error: 'This connector is not connected to Stratek yet.', status: 409 };
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const parts = token.split('.');
  if (parts.length !== 3) return { error: 'Missing or malformed Stratek pass.', status: 401 };
  let header, claims;
  try { header = b64urlJson(parts[0]); claims = b64urlJson(parts[1]); } catch { return { error: 'Malformed Stratek pass.', status: 401 }; }
  if (header.alg !== 'EdDSA') return { error: 'Unsupported pass.', status: 401 };

  let key = pairing.stratekKey;
  if (!key || header.kid !== key.kid) {
    // Stratek rotated its key: fetch the current one from the paired Stratek (HTTPS).
    try { key = await fetchStratekKey(pairing.stratekUrl); } catch (err) { return { error: err.message, status: 502 }; }
    if (header.kid !== key.kid) return { error: 'Pass signed with an unknown key.', status: 401 };
    await saveKey(key);
  }
  let ok = false;
  try { ok = await verifySignature(key.jwk, `${parts[0]}.${parts[1]}`, b64urlToBytes(parts[2])); } catch { ok = false; }
  if (!ok) return { error: 'Invalid Stratek pass.', status: 401 };

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp < now) return { error: 'Your Stratek pass has expired -- reload the page.', status: 401 };
  if (claims.iss !== key.issuer) return { error: 'Pass is from a different Stratek.', status: 401 };
  if (claims.aud !== pairing.connectorId) return { error: 'Pass is for a different connector.', status: 403 };
  if (claims.sub !== `${pairing.ownerType}:${pairing.ownerId}`) return { error: 'Pass is for a different account.', status: 403 };
  return { claims };
}
