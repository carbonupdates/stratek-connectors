// storefront.js -- the shop's online store served from the shop's OWN
// Cloudflare (v0.11.0): on its own domain (e.g. https://shop.chyaubio.com/) or
// on this connector's workers.dev address (https://<connector>/shop).
//
// The page, menu, orders and payments still come from Stratek (one source of
// truth, same rules): this Worker serves Stratek's store page with a small
// config, and forwards the store's API calls to Stratek, signed with this
// connector's event key so Stratek can trust the customer IP (rate limits) and
// the address the customer used (order links). Only GET/POST of the store API
// for this shop's own store are forwarded -- nothing else of Stratek.
//
// Config (set by Stratek with a pass, POST /storefront):
//   { slug, workersDev: boolean, hostnames: ['shop.example.com'] }

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const HOST_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const STATIC = /^\/(js|assets)\/[\w./-]{1,120}$|^\/media\/menu\/[\w./-]{1,200}$/;
const MAX_BODY = 64 * 1024;

export function cleanStorefront(body) {
  const slug = String(body?.slug || '').toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) throw Object.assign(new Error('Bad store link.'), { status: 400 });
  const hostnames = (Array.isArray(body?.hostnames) ? body.hostnames : []).map((h) => String(h).toLowerCase().trim()).filter(Boolean);
  if (hostnames.length > 3 || hostnames.some((h) => !HOST_RE.test(h) || h.endsWith('.workers.dev'))) throw Object.assign(new Error('Bad domain name.'), { status: 400 });
  return { slug, workersDev: !!body?.workersDev, hostnames, updatedAt: new Date().toISOString() };
}

/** Which storefront (if any) this request is for -> { cfg, base } or null. */
export function matchStorefront(cfg, url) {
  if (!cfg?.slug) return null;
  if (cfg.hostnames?.includes(url.hostname)) return { cfg, base: '' };
  if (cfg.workersDev && url.hostname.endsWith('.workers.dev') && (url.pathname === '/shop' || url.pathname.startsWith('/shop/'))) return { cfg, base: '/shop' };
  if (cfg.workersDev && url.hostname.endsWith('.workers.dev') && STATIC.test(url.pathname)) return { cfg, base: '/shop', staticOnly: true };
  return null;
}

async function sign(db, keyPairFn, parts) {
  const kp = await keyPairFn(db);
  const key = await crypto.subtle.importKey('jwk', { ...kp.priv, key_ops: ['sign'] }, { name: 'Ed25519' }, false, ['sign']);
  const t = Math.floor(Date.now() / 1000);
  const sig = b64url(await crypto.subtle.sign({ name: 'Ed25519' }, key, new TextEncoder().encode(`${t}.${parts.join('.')}`)));
  return `t=${t},sig=${sig}`;
}

const notFound = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

/** Serves one storefront request. */
export async function serveStorefront(request, { db, pairing, stratekUrl, match, keyPair }) {
  const url = new URL(request.url);
  const { cfg, base } = match;
  const path = url.pathname.slice(base.length) || '/';
  const origin = `${url.origin}${base}`;

  // Static files of the store page (Stratek's own), GET only.
  if (STATIC.test(url.pathname)) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return notFound();
    const res = await fetch(`${stratekUrl}${url.pathname}`, { cf: { cacheTtl: 300 } });
    return new Response(res.body, { status: res.status, headers: res.headers });
  }
  if (match.staticOnly) return notFound();
  if (!pairing) return new Response('This store is not connected yet.', { status: 503 });

  // The store's API -> Stratek, signed.
  const api = path.match(/^\/api(\/[\w./-]*)?$/);
  if (api) {
    if (!['GET', 'POST'].includes(request.method)) return notFound();
    const rest = api[1] || '';
    if (rest.includes('..')) return notFound();
    const body = request.method === 'POST' ? await request.text() : null;
    if (body && body.length > MAX_BODY) return new Response('Too large.', { status: 413 });
    const target = `/api/v1/store/${cfg.slug}${rest}${url.search}`;
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const sig = await sign(db, keyPair, [request.method, target, ip, origin]);
    const res = await fetch(`${stratekUrl}${target}`, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Stratek-Connector': pairing.connectorId,
        'X-Stratek-Storefront': sig,
        'X-Store-Client-IP': ip,
        'X-Store-Origin': origin,
      },
      body,
    });
    return new Response(res.body, { status: res.status, headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store' } });
  }

  // The page itself: / and /order/<token>.
  if (request.method === 'GET' && (/^\/?$/.test(path) || /^\/order\/[A-Za-z0-9_-]{20,200}\/?$/.test(path))) {
    const res = await fetch(`${stratekUrl}/store/${cfg.slug}`, { cf: { cacheTtl: 60 } });
    if (!res.ok) return new Response('The store page is not available right now.', { status: 502 });
    const html = (await res.text()).replace('</head>', `<script>window.STRATEK_STORE=${JSON.stringify({ slug: cfg.slug, base })};</script></head>`);
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    });
  }
  if (base === '/shop' && url.pathname === '/shop') return Response.redirect(`${url.origin}/shop/`, 301);
  return notFound();
}
