// Shared by the "send a sale somewhere" integrations (Webhook, Zapier, Make, Slack).
//
// Payload (JSON) -- the same for Webhook, Zapier and Make:
//   { type: 'sale' | 'inventory' | 'test', sentAt, mode: 'live' | 'test', shop,
//     sale?: { id, amount, currency, reference, items[{name,price,qty}], bill, createdAt },
//     customer?: { name, email, phone },      // online-store orders only
//     inventory?: { currency, items[...] } }
// Webhook with a signing secret adds  X-Stratek-Signature: t=<unix>,v1=<hex HMAC-SHA256 of "<t>.<body>">

import { sale } from './_util.js';

/** Checks a URL the owner pasted: https, and (optionally) on the expected host. */
export function hookUrl(raw, { name, host } = {}) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch { throw new Error(`${name}: paste the full address (https://...) in Set up.`); }
  if (u.protocol !== 'https:') throw new Error(`${name}: the address must start with https://`);
  if (host && !host.test(u.hostname)) throw new Error(`${name}: that doesn't look like a ${name} address (${u.hostname}). Copy it again from ${name}.`);
  return u.toString();
}

export function customerOf(context, fields = {}) {
  const c = context?.customer || {};
  const out = { name: String(fields.name || c.name || '').trim() || null, email: String(fields.email || c.email || '').trim() || null, phone: String(fields.phone || c.phone || '').trim() || null };
  return out.name || out.email || out.phone ? out : null;
}

export function salePayload({ context, mode, claims, type = 'sale' }) {
  const body = { type, sentAt: new Date().toISOString(), mode: mode === 'test' ? 'test' : 'live', shop: claims?.owner_name || null };
  if (type === 'sale') {
    const tx = sale(context);
    body.sale = { id: tx.id, amount: Number(tx.amount), currency: tx.currency, reference: tx.reference || null, items: tx.items || [], bill: tx.bill || null, createdAt: tx.createdAt || null };
    const customer = customerOf(context);
    if (customer) body.customer = customer;
  }
  if (type === 'inventory') {
    const m = context?.menu;
    if (!m?.items) throw new Error('Open this from the Integrations tab (it sends your inventory).');
    body.inventory = { currency: m.currency, items: m.items };
  }
  return body;
}

async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** POSTs JSON; throws a readable error unless the receiver answers 2xx. */
export async function postJson(url, payload, { name, secret, headers = {} } = {}) {
  const body = JSON.stringify(payload);
  const h = { 'Content-Type': 'application/json', 'User-Agent': 'Stratek-Connector', 'X-Stratek-Event': payload.type || 'sale', ...headers };
  if (secret) { const t = Math.floor(Date.now() / 1000); h['X-Stratek-Signature'] = `t=${t},v1=${await hmacHex(secret, `${t}.${body}`)}`; }
  let res;
  try { res = await fetch(url, { method: 'POST', headers: h, body, signal: AbortSignal.timeout(10000) }); }
  catch (err) { throw new Error(`${name}: couldn't reach the address (${err?.name === 'TimeoutError' ? 'no answer in 10 s' : err?.message || 'network error'}).`); }
  const text = await res.text().catch(() => '');
  if (!res.ok) throw new Error(`${name}: the address answered ${res.status}${text ? ` (${text.slice(0, 120)})` : ''}.`);
  return { status: res.status, text };
}

export const money = (amount, currency) => `${String(currency || 'NPR').toUpperCase() === 'NPR' ? 'Rs' : String(currency).toUpperCase()} ${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const itemsLine = (items = []) => items.map((i) => `${i.qty || 1} × ${i.name}`).join(', ');
