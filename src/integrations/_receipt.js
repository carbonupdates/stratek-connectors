// Receipt text / HTML for messages to customers (Twilio SMS, Resend email...).
import { money } from './_hooks.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function receiptText(tx, shop, { test = false, max = 600 } = {}) {
  const lines = (tx.items || []).slice(0, 12).map((i) => `${i.qty || 1} x ${i.name} ${money(Number(i.price) * Number(i.qty || 1), tx.currency)}`);
  return `${test ? '[TEST] ' : ''}${shop || 'Shop'} -- receipt #${tx.id}\n${lines.join('\n')}${lines.length ? '\n' : ''}Total ${money(tx.amount, tx.currency)}\nThank you!`.slice(0, max);
}

export function receiptHtml(tx, shop, { test = false } = {}) {
  const rows = (tx.items || []).map((i) => `<tr><td>${esc(i.qty || 1)} &times; ${esc(i.name)}</td><td style="text-align:right">${esc(money(Number(i.price) * Number(i.qty || 1), tx.currency))}</td></tr>`).join('');
  const b = tx.bill || {};
  const extra = [['VAT', b.vat], ['Service charge', b.service], ['Discount', b.discount ? -Math.abs(b.discount) : 0]].filter(([, v]) => Number(v)).map(([k, v]) => `<tr><td>${k}</td><td style="text-align:right">${esc(money(v, tx.currency))}</td></tr>`).join('');
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#222;max-width:480px;margin:auto;padding:16px">
${test ? '<p style="color:#b00"><strong>TEST receipt</strong></p>' : ''}<h2 style="margin:0 0 4px">${esc(shop || 'Shop')}</h2><p style="margin:0 0 12px;color:#666">Receipt #${esc(tx.id)}${tx.createdAt ? ` &middot; ${esc(String(tx.createdAt).slice(0, 16))}` : ''}</p>
<table style="width:100%;border-collapse:collapse">${rows}${extra}<tr><td style="border-top:1px solid #ddd;padding-top:6px"><strong>Total</strong></td><td style="border-top:1px solid #ddd;padding-top:6px;text-align:right"><strong>${esc(money(tx.amount, tx.currency))}</strong></td></tr></table>
<p style="color:#666">Thank you!</p></body></html>`;
}
