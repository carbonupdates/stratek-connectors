// events.js -- signed events from this connector to Stratek (e.g. "sale #123
// was paid through PayBridgeNP").
//
// The connector keeps its own Ed25519 key pair in its Durable Object and
// publishes the public half at GET /event-key. Stratek knows this connector's
// address from pairing, fetches that key from it, and checks every event:
//   POST <STRATEK_URL>/api/v1/connectors/events
//   X-Stratek-Connector: <connectorId>
//   X-Stratek-Signature: t=<unix seconds>,sig=<base64url Ed25519 over "<t>.<body>">
// Stratek still never settles a sale by itself -- a paid event only marks the
// sale "paid online (verified)"; a person at the shop presses Settle.

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function keyPair(db) {
  let kp = await db.get('event_key');
  if (!kp) {
    const k = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const priv = await crypto.subtle.exportKey('jwk', k.privateKey);
    const pub = await crypto.subtle.exportKey('jwk', k.publicKey);
    const kid = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pub.x))).slice(0, 16);
    kp = { priv, pub: { kty: 'OKP', crv: 'Ed25519', x: pub.x, kid } };
    await db.put('event_key', kp);
  }
  return kp;
}

/** Public half, served at GET /event-key (no secret in it). */
export async function publicEventKey(db) {
  return (await keyPair(db)).pub;
}

/**
 * Signs and sends one event to the paired Stratek. event = { id, type, data }.
 * Returns Stratek's answer; throws when Stratek refuses or can't be reached.
 */
export async function emitEvent(db, event) {
  const pairing = await db.get('pairing');
  if (!pairing) throw new Error('Not connected to Stratek.');
  const kp = await keyPair(db);
  const key = await crypto.subtle.importKey('jwk', { ...kp.priv, key_ops: ['sign'] }, { name: 'Ed25519' }, false, ['sign']);
  const body = JSON.stringify({ ...event, connectorId: pairing.connectorId, sentAt: new Date().toISOString() });
  const t = Math.floor(Date.now() / 1000);
  const sig = b64url(await crypto.subtle.sign({ name: 'Ed25519' }, key, new TextEncoder().encode(`${t}.${body}`)));
  const res = await fetch(`${pairing.stratekUrl}/api/v1/connectors/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Stratek-Connector': pairing.connectorId, 'X-Stratek-Signature': `t=${t},sig=${sig}` },
    body,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error?.message || `Stratek answered ${res.status}.`);
  return json.data;
}
