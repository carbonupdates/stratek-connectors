// Helpers for Nepal integrations (Khalti, eSewa, connectIPS, IRD CBMS).

// ── Bikram Sambat (BS) dates ──
// Month lengths for BS 2070-2099, one digit per month = days - 29 (from the
// maintained open-source calendars py-nepali / Nepali-Date-Picker, which agree).
// BS 2070-01-01 = 2013-04-14 AD. Extend the table when IRD publishes later years.
const BS_START = 2070;
const BS_REF_UTC = Date.UTC(2013, 3, 14);
const BS_DATA = '222322011011,223222101011,232321101011,232321110012,222322101011,223222101011,232321110011,232321110102,222322101011,223222101011,232321110011,232321110102,223222101011,223222101011,232321110012,132321110102,223222101011,223321101011,232321110012,132321110102,223222101011,223321101011,232321110012,222322011002,223222101011,223321101011,232321110012,222322011011,223222101011,223321101011'.split(',').map((y) => [...y].map((d) => Number(d) + 29));

/** AD date (Date, or a 'YYYY-MM-DD[ HH:MM:SS]' UTC string) -> { y, m, d } in BS, by the Nepal calendar day. */
export function toBS(input = new Date()) {
  const date = input instanceof Date ? input : new Date(String(input).replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(input)) ? '' : 'Z'));
  const nepal = new Date(date.getTime() + 345 * 60000); // Nepal is UTC+5:45
  let days = Math.floor((Date.UTC(nepal.getUTCFullYear(), nepal.getUTCMonth(), nepal.getUTCDate()) - BS_REF_UTC) / 86400000);
  if (days < 0) throw new Error('Date is before BS 2070.');
  for (let yi = 0; yi < BS_DATA.length; yi++) {
    for (let mi = 0; mi < 12; mi++) {
      const len = BS_DATA[yi][mi];
      if (days < len) return { y: BS_START + yi, m: mi + 1, d: days + 1 };
      days -= len;
    }
  }
  throw new Error('Date is after BS 2099 -- update the calendar table in _nepal.js.');
}
const p2 = (n) => String(n).padStart(2, '0');
/** "2083.06.14" (IRD format YYYY.MM.DD). */
export const bsString = (bs) => `${bs.y}.${p2(bs.m)}.${p2(bs.d)}`;
/** Nepal's fiscal year starts on Shrawan 1 (month 4): "2083.084" (IRD format YYYY.0YY). */
export const fiscalYear = (bs) => { const start = bs.m >= 4 ? bs.y : bs.y - 1; return `${start}.${String(start + 1).slice(1)}`; };

// ── Payments ──
export const paisa = (amount) => { const n = Math.round(Number(amount) * 100); if (!Number.isFinite(n) || n <= 0) throw new Error('This sale has no amount to charge.'); return n; };
export const rupees = (p) => (p / 100).toFixed(2);
export const randomToken = (bytes = 18) => [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
export const requireNpr = (tx, name) => { if (String(tx.currency || 'NPR').toUpperCase() !== 'NPR') throw new Error(`${name} only takes payments in NPR.`); };

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function html(title, body, status = 200) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#fdecec;color:#201414;display:grid;place-items:center;min-height:100vh}
main{background:#fff;border:1px solid #e6caca;border-radius:16px;padding:28px 24px;max-width:420px;margin:16px;text-align:center}
h1{font-size:1.3rem;margin:0 0 8px}p{color:#574646;line-height:1.5}.amt{font-size:1.8rem;font-weight:700;color:#201414;margin:8px 0}
button{background:#c81e2c;color:#fff;border:0;border-radius:999px;padding:14px 26px;font-weight:700;font-size:1rem;cursor:pointer}
.ok{color:#1e7a3e;font-weight:700}.err{color:#b3261e;font-weight:700}</style></head><body><main>${body}</main></body></html>`,
  { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' } });
}

/** A page that posts a form to a payment gateway (auto-submits; button as a fallback). */
export function gatewayFormPage({ title, amountText, action, fields, buttonLabel }) {
  const inputs = Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join('');
  return html(title, `<h1>${esc(title)}</h1><div class="amt">${esc(amountText)}</div>
<form id="f" method="POST" action="${esc(action)}">${inputs}<button type="submit">${esc(buttonLabel)}</button></form>
<p>Taking you to the payment page&hellip;</p><script>setTimeout(function(){document.getElementById('f').submit()},300)</script>`);
}

export function resultPage(ok, text) {
  return html(ok ? 'Payment received' : 'Payment not completed', ok
    ? `<h1 class="ok">Payment received</h1><p>${esc(text || 'Thank you! The shop can see your payment.')}</p>`
    : `<h1 class="err">Payment not completed</h1><p>${esc(text || 'Nothing was charged. Please show this screen to the shop or try again.')}</p>`, ok ? 200 : 400);
}

/** Tells Stratek a sale was paid (it marks it "Paid online"; a person still presses Settle). */
export async function emitPaid(emit, { integration, provider, txId, amountPaisa, ref, livemode, method }) {
  await emit({ id: `${integration}-${ref}`, type: 'payment.succeeded', data: { transactionId: String(txId), amount: amountPaisa / 100, currency: 'NPR', provider, integration, providerRef: String(ref), method: method || integration, livemode } });
}
