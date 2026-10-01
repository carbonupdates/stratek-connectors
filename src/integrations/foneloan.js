// foneloan -- Buy Now Pay Later (EMI) with Foneloan, F1Soft's lending service
// run by Nepali banks (v0.24.0). Category: Subscription management.
//
// Bring your own Foneloan QR: a shop that is a Foneloan partner gets a QR from
// Foneloan / F1Soft (an EMVCo QR whose merchant account says "com.foneloan").
// Paste its text in Set up. Stratek shows it AS IS -- no changes -- when the
// customer picks "Buy Now Pay Later" at the till or kiosk (the shop ticks
// "Show Buy Now Pay Later at the till & kiosk" on this row).
//
// How the money moves: the customer scans with a partner bank's app, picks a
// plan (3, 6, 9 or 12 months) and, if the bank approves, the BANK pays the shop
// in full. The customer repays the bank. Neither the shop nor Stratek lends.
// Foneloan has no public API, so nothing reports the payment: a person checks
// it arrived and presses Settle, exactly like the shop's own QR.
//
// Minimum: Rs 15,000 per sale (Stratek's rule; banks set their own limits too).
// Test keys: any Foneloan QR you have (e.g. one from a Foneloan shop) to try the
// till and kiosk screens -- never pay a test QR.

export const BNPL_MIN_AMOUNT = 15000;

const parseTlv = (s) => {
  const out = []; let i = 0;
  while (i + 4 <= s.length) {
    const tag = s.slice(i, i + 2); const len = Number(s.slice(i + 2, i + 4));
    if (!Number.isInteger(len) || i + 4 + len > s.length) return null;
    out.push({ tag, value: s.slice(i + 4, i + 4 + len) }); i += 4 + len;
  }
  return i === s.length ? out : null;
};

function crc16(text) {
  let crc = 0xffff;
  for (const b of new TextEncoder().encode(text)) {
    crc ^= b << 8;
    for (let k = 0; k < 8; k++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Checks a pasted Foneloan QR. Returns { ok, merchantName, amount, storeLabel } or { ok: false, reason }. */
export function readFoneloanQr(raw) {
  const s = String(raw || '').trim();
  if (!s.startsWith('000201')) return { ok: false, reason: 'This is not a payment QR (it should start with 000201). Scan your Foneloan QR with a QR reader and paste the text.' };
  const crcAt = s.lastIndexOf('6304');
  if (crcAt < 0 || crcAt + 8 !== s.length) return { ok: false, reason: 'The QR text looks cut off (no check code at the end). Copy the whole text again.' };
  if (crc16(s.slice(0, crcAt + 4)) !== s.slice(crcAt + 4).toUpperCase()) return { ok: false, reason: 'The QR check code does not match -- part of the text is missing or changed. Copy it again.' };
  const fields = parseTlv(s);
  if (!fields) return { ok: false, reason: 'Could not read the QR fields. Copy the whole text again.' };
  const accounts = fields.filter((f) => Number(f.tag) >= 26 && Number(f.tag) <= 51);
  const isFoneloan = accounts.some((f) => (parseTlv(f.value) || []).some((sub) => sub.tag === '00' && sub.value.toLowerCase() === 'com.foneloan'));
  if (!isFoneloan) return { ok: false, reason: 'This QR is not a Foneloan QR (it does not say com.foneloan). Use the QR Foneloan / F1Soft gave your shop, not your regular Fonepay QR.' };
  const get = (t) => fields.find((f) => f.tag === t)?.value || null;
  const extra = parseTlv(get('62') || '') || [];
  const amount = get('54') ? Number(get('54')) : null;
  return { ok: true, merchantName: (get('59') || '').trim(), city: (get('60') || '').trim(), currency: get('53'), amount: Number.isFinite(amount) ? amount : null, storeLabel: extra.find((f) => f.tag === '03')?.value || null };
}

const rs = (n) => `Rs ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default {
  id: 'foneloan',
  name: 'Foneloan (Buy Now Pay Later)',
  category: 'subscriptions',
  status: 'available',
  color: '#1f4fa3',
  bnplProvider: true,
  description: `Buy Now Pay Later on EMI for sales from ${rs(BNPL_MIN_AMOUNT)}: the customer scans your Foneloan QR, their bank pays you in full, they repay the bank in 3-12 months. For Foneloan partner shops.`,
  docsUrl: 'https://foneloan.com.np/',
  test: { support: 'sandbox', note: 'Paste any Foneloan QR you have (for example one from a Foneloan shop) as the test QR to try the till and kiosk screens. Never pay a test QR.' },
  secrets: [
    { name: 'FONELOAN_QR', label: 'Foneloan QR text', hint: 'The QR Foneloan / F1Soft gave your shop when it joined as a Foneloan partner. Read it with any QR reader (e.g. zxing.org/w/decode) and paste the text starting with 000201. Your regular Fonepay QR will not work here.' },
  ],
  async onKeysSaved({ env }) {
    const q = readFoneloanQr(env.FONELOAN_QR);
    if (!q.ok) throw new Error(q.reason);
    return `Foneloan QR for ${q.merchantName || 'your shop'} is saved -- tick "Show Buy Now Pay Later at the till & kiosk" on the Foneloan row${q.amount ? `. Note: this QR has a fixed amount of ${rs(q.amount)} in it` : ''}`;
  },
  actions: [
    {
      id: 'test', label: 'Check Foneloan QR', placement: ['settings'], fields: [],
      async run({ env, mode }) {
        const q = readFoneloanQr(env.FONELOAN_QR);
        if (!q.ok) throw new Error(q.reason);
        return { type: 'message', title: 'Foneloan QR is valid', text: `${q.merchantName || 'Merchant name not in QR'}${q.storeLabel ? ` (store ${q.storeLabel})` : ''}${q.amount ? ` -- fixed amount ${rs(q.amount)} in the QR` : ' -- no fixed amount, the customer confirms the amount in the bank app'}.${mode === 'test' ? ' TEST QR: try the screens only, never pay it.' : ''}` };
      },
    },
    {
      // Hidden: Stratek calls it when the customer picks "Buy Now Pay Later" at the till or kiosk (placement 'bnpl' is never a button).
      id: 'bnpl_qr', label: 'Buy Now Pay Later QR', placement: ['bnpl'], fields: [],
      async run({ env, context, mode }) {
        const tx = context?.transaction || {};
        const amount = Number(tx.amount);
        if (tx.currency && String(tx.currency).toUpperCase() !== 'NPR') throw new Error('Foneloan only works in NPR.');
        if (!Number.isFinite(amount) || amount < BNPL_MIN_AMOUNT) throw Object.assign(new Error(`Buy Now Pay Later starts at ${rs(BNPL_MIN_AMOUNT)}.`), { status: 400 });
        const q = readFoneloanQr(env.FONELOAN_QR);
        if (!q.ok) throw new Error(q.reason);
        const fixed = q.amount && Math.abs(q.amount - amount) > 0.005 ? ` This Foneloan QR has a fixed amount of ${rs(q.amount)}, not ${rs(amount)} -- ask Foneloan for a QR without a fixed amount.` : '';
        return {
          type: 'qr',
          title: `Buy Now Pay Later -- ${rs(amount)}`,
          text: `Scan with your bank's app and choose Buy Now Pay Later, then pick 3, 6, 9 or 12 months. Your bank decides if you qualify and its interest and fees; it pays the shop in full and you repay the bank.${q.amount ? '' : ` Confirm ${rs(amount)} in the app.`}${fixed}`,
          qrPayload: String(env.FONELOAN_QR).trim(),
          provider: 'Foneloan',
          amountInQr: q.amount,
          livemode: mode !== 'test',
        };
      },
    },
  ],
};
