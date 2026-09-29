// Small helpers shared by integrations.

// Currencies with no minor unit (amount is sent as a whole number).
const ZERO_DECIMAL = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);

/** 11.5 NPR -> 1150 (minor units); 500 JPY -> 500. */
export function toMinor(amount, currency) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) throw new Error('This sale has no amount to charge.');
  return ZERO_DECIMAL.has(String(currency).toUpperCase()) ? Math.round(n) : Math.round(n * 100);
}

/** 11.5 -> "11.50" (or "500" for zero-decimal currencies). */
export function toDecimalString(amount, currency) {
  const n = Number(amount);
  return ZERO_DECIMAL.has(String(currency).toUpperCase()) ? String(Math.round(n)) : n.toFixed(2);
}

/** The sale this action runs on (from Stratek), or an error. */
export function sale(context) {
  const tx = context?.transaction;
  if (!tx?.id) throw new Error('Open this from a sale.');
  return { ...tx, id: String(tx.id), currency: String(tx.currency || 'NPR').toUpperCase() };
}

export const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const b64urlText = (s) => b64url(new TextEncoder().encode(s));

export async function sha256Hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
