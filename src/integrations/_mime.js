// _mime.js -- just enough MIME parsing for incoming business email (v0.26.0):
// headers, and the plain text of a message (text/plain preferred, else HTML
// with tags removed). Handles multipart, base64 and quoted-printable.

const dec = (bytes, charset = 'utf-8') => { try { return new TextDecoder(charset, { fatal: false }).decode(bytes); } catch { return new TextDecoder('utf-8').decode(bytes); } };
const latin1 = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 255);

function splitHead(raw) {
  const i = raw.search(/\r?\n\r?\n/);
  if (i < 0) return { head: raw, body: '' };
  const m = raw.slice(i).match(/^\r?\n\r?\n/);
  return { head: raw.slice(0, i), body: raw.slice(i + m[0].length) };
}

export function parseHeaders(head) {
  const out = {};
  for (const line of head.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const k = line.indexOf(':'); if (k < 1) continue;
    const name = line.slice(0, k).trim().toLowerCase();
    if (!(name in out)) out[name] = line.slice(k + 1).trim();
  }
  return out;
}

/** RFC 2047 encoded words: =?utf-8?B?...?= / =?utf-8?Q?...?= */
export function decodeWords(s) {
  return String(s || '').replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_, cs, enc, txt) => {
    try {
      const bytes = enc.toUpperCase() === 'B' ? latin1(atob(txt)) : latin1(txt.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16))));
      return dec(bytes, cs);
    } catch { return txt; }
  }).replace(/\?=\s+=\?/g, '');
}

const param = (v, p) => { const m = String(v || '').match(new RegExp(`${p}\\s*=\\s*("([^"]*)"|[^;\\s]+)`, 'i')); return m ? (m[2] ?? m[1]) : null; };

function decodeBody(body, headers) {
  const enc = String(headers['content-transfer-encoding'] || '').toLowerCase();
  const charset = param(headers['content-type'], 'charset') || 'utf-8';
  if (enc === 'base64') { try { return dec(latin1(atob(body.replace(/\s+/g, ''))), charset); } catch { return ''; } }
  if (enc === 'quoted-printable') return dec(latin1(body.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)))), charset);
  return dec(latin1(body), charset);
}

const stripHtml = (h) => h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function findText(head, body, depth = 0) {
  const h = parseHeaders(head);
  const type = String(h['content-type'] || 'text/plain').toLowerCase();
  if (type.startsWith('multipart/') && depth < 5) {
    const b = param(h['content-type'], 'boundary');
    if (!b) return { plain: '', html: '' };
    const parts = body.split(`--${b}`).slice(1).filter((p) => !p.startsWith('--'));
    let plain = ''; let html = '';
    for (const p of parts) {
      const s = splitHead(p.replace(/^\r?\n/, ''));
      const r = findText(s.head, s.body, depth + 1);
      plain = plain || r.plain; html = html || r.html;
    }
    return { plain, html };
  }
  if (/attachment/i.test(h['content-disposition'] || '')) return { plain: '', html: '' };
  if (type.startsWith('text/html')) return { plain: '', html: decodeBody(body, h) };
  if (type.startsWith('text/')) return { plain: decodeBody(body, h), html: '' };
  return { plain: '', html: '' };
}

/** raw (string, latin1 bytes as chars) -> { headers, subject, text } */
export function parseMail(raw) {
  const { head, body } = splitHead(raw);
  const headers = parseHeaders(head);
  const { plain, html } = findText(head, body);
  const text = (plain || stripHtml(html)).replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  return { headers, subject: decodeWords(headers.subject || '(no subject)'), text };
}

/** "Sita Rai <sita@x.com>" -> { name, email } */
export function parseAddress(v) {
  const s = decodeWords(v || '');
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
  if (m) return { name: m[1].trim() || null, email: m[2].trim().toLowerCase() };
  const e = s.match(/[^\s<>,;]+@[^\s<>,;]+/);
  return { name: null, email: e ? e[0].toLowerCase() : '' };
}
