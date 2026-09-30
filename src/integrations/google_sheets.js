// google_sheets -- add sales as rows to a Google Sheet, and copy your inventory into it.
// Uses a Google Cloud service account (no Google login in Stratek): create one, give it
// a JSON key, and share the sheet with the service account's email as Editor.
//   token: JWT (RS256, WebCrypto) -> https://oauth2.googleapis.com/token
//   rows:  POST sheets.googleapis.com/v4/spreadsheets/{id}/values/{tab}!A1:append
// Buttons: Test Google Sheets, Copy inventory to Google Sheet (Integrations tab);
// Add sale to Google Sheet (sale details).

import { sale, b64url, b64urlText } from './_util.js';
import { customerOf, itemsLine } from './_hooks.js';

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const SALES_HEADER = ['Date', 'Sale #', 'Reference', 'Items', 'Amount', 'Currency', 'Customer', 'Mode'];
const INV_HEADER = ['Name', 'Category', 'Price', 'Available', 'Description', 'Photo', 'Stratek ID'];

function account(env) {
  let a;
  try { a = JSON.parse(String(env.GOOGLE_SERVICE_ACCOUNT_JSON || '')); } catch { throw new Error('Google Sheets: the service account key must be the whole JSON file you downloaded (it starts with {).'); }
  if (!a.client_email || !a.private_key) throw new Error('Google Sheets: that JSON has no client_email / private_key -- download a JSON key for the service account.');
  return a;
}

export function sheetId(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  const id = m ? m[1] : s;
  if (!/^[a-zA-Z0-9_-]{20,}$/.test(id)) throw new Error('Google Sheets: paste the sheet\'s link or its ID (the long part after /d/ in the address).');
  return id;
}

async function accessToken(env, store) {
  const a = account(env);
  const cached = await store.get('token');
  if (cached && cached.email === a.client_email && cached.exp > Date.now() + 60000) return cached.token;
  const pem = a.private_key.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64urlText(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64urlText(JSON.stringify({ iss: a.client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${b64url(sig)}` }) });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.access_token) throw new Error(`Google Sheets: Google refused the service account key (${j?.error_description || j?.error || res.status}).`);
  await store.put('token', { token: j.access_token, email: a.client_email, exp: Date.now() + (j.expires_in || 3600) * 1000 });
  return j.access_token;
}

async function sheets(env, store, method, path, body) {
  const token = await accessToken(env, store);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId(env.GOOGLE_SHEET_ID)}${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => null);
  if (res.status === 403 || res.status === 404) throw new Error(`Google Sheets: can't open that sheet. Share it with ${account(env).client_email} as Editor, and check the sheet link in Set up.`);
  if (!res.ok) throw new Error(`Google Sheets: ${j?.error?.message || `error ${res.status}`}`);
  return j;
}

const q = (tab) => `'${String(tab).replace(/'/g, "''")}'`;
const salesTab = (env) => String(env.GOOGLE_SHEET_TAB || 'Sales').trim().slice(0, 90) || 'Sales';

/** Makes the tab if it isn't there yet (with a header row). */
async function ensureTab(env, store, tab, header) {
  const meta = await sheets(env, store, 'GET', '?fields=properties.title,sheets.properties.title');
  if ((meta.sheets || []).some((s) => s.properties?.title === tab)) return meta;
  await sheets(env, store, 'POST', ':batchUpdate', { requests: [{ addSheet: { properties: { title: tab } } }] });
  await sheets(env, store, 'PUT', `/values/${encodeURIComponent(`${q(tab)}!A1`)}?valueInputOption=RAW`, { values: [header] });
  return meta;
}

const nepalTime = (iso) => { const d = iso ? new Date(String(iso).replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? '' : 'Z')) : new Date(); return new Date(d.getTime() + 345 * 60000).toISOString().slice(0, 16).replace('T', ' '); };

export default {
  id: 'google_sheets',
  name: 'Google Sheets',
  category: 'accounting',
  status: 'available',
  description: 'Add sales as rows to your Google Sheet and copy your inventory into it.',
  docsUrl: 'https://developers.google.com/workspace/sheets/api/guides/concepts',
  test: { support: 'none', note: 'Test-mode sales are written with Mode "test" so you can filter them out.' },
  secrets: [
    { name: 'GOOGLE_SERVICE_ACCOUNT_JSON', label: 'Service account key (JSON)', hint: 'Google Cloud console -> IAM -> Service accounts -> create one -> Keys -> Add key -> JSON. Enable the Google Sheets API for the project. Paste the whole file here.' },
    { name: 'GOOGLE_SHEET_ID', label: 'Sheet link or ID', hint: 'Open the sheet and copy its address. Share the sheet with the service account\'s email (client_email in the JSON) as Editor.' },
    { name: 'GOOGLE_SHEET_TAB', label: 'Tab for sales', hint: 'Optional, default "Sales" (made for you if missing).', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test Google Sheets', placement: ['settings'], fields: [],
      async run({ env, store }) {
        const meta = await sheets(env, store, 'GET', '?fields=properties.title');
        return { type: 'message', title: 'Google Sheets is connected', text: `Sheet "${meta.properties?.title || '?'}". Sales go to the "${salesTab(env)}" tab.` };
      },
    },
    {
      id: 'export_inventory', label: 'Copy inventory to Google Sheet', placement: ['settings'], context: ['menu'], fields: [],
      async run({ env, store, context }) {
        const items = context?.menu?.items;
        if (!items) throw new Error('Open this from the Integrations tab.');
        await ensureTab(env, store, 'Inventory', INV_HEADER);
        await sheets(env, store, 'POST', `/values/${encodeURIComponent(`${q('Inventory')}!A:Z`)}:clear`, {});
        const rows = items.map((i) => [i.name, i.category || '', Number(i.price), i.available ? 'yes' : 'no', i.description || '', i.photo || '', String(i.id)]);
        await sheets(env, store, 'PUT', `/values/${encodeURIComponent(`${q('Inventory')}!A1`)}?valueInputOption=RAW`, { values: [INV_HEADER, ...rows] });
        return { type: 'message', title: 'Inventory copied', text: `${rows.length} items written to the "Inventory" tab (replaces what was there).` };
      },
    },
    {
      id: 'add_row', label: 'Add sale to Google Sheet', placement: ['transaction'], fields: [],
      async run({ env, store, context, mode }) {
        const tx = sale(context);
        const tab = salesTab(env);
        await ensureTab(env, store, tab, SALES_HEADER);
        const c = customerOf(context);
        const row = [nepalTime(tx.createdAt), Number(tx.id), tx.reference || '', itemsLine(tx.items), Number(tx.amount), tx.currency, c ? [c.name, c.email, c.phone].filter(Boolean).join(' · ') : '', mode === 'test' ? 'test' : 'live'];
        await sheets(env, store, 'POST', `/values/${encodeURIComponent(`${q(tab)}!A1`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { values: [row] });
        return { type: 'message', title: 'Added to Google Sheet', text: `Sale #${tx.id} added to "${tab}".` };
      },
    },
  ],
};
