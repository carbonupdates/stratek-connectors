// beds24 -- charge a restaurant, bar, spa or shop sale to a guest's booking in Beds24
// (hotels, guesthouses, homestays, holiday rentals), and see who is in house / arriving.
// Beds24 -> Settings -> Marketplace -> API -> generate an invite code (scopes: read and write
// bookings, read properties) and paste it here. Saving swaps it for a long-lived refresh
// token kept in this connector (the invite code works once).
//   API: https://beds24.com/api/v2 (header token) -- GET /authentication/setup (code),
//        GET /authentication/token (refreshToken), GET /properties, GET /bookings,
//        POST /bookings (invoiceItems)
// Buttons: Test Beds24, Guests in house, Today's arrivals (Integrations tab);
// Charge to room (Beds24) on the sale (needs a person -- it bills a guest).

import { sale } from './_util.js';
import { readJson, cachedToken } from './_ship.js';
import { matchGuest, folioLines } from './cloudbeds.js';

const BASE = 'https://beds24.com/api/v2';

async function raw(path, headers, method = 'GET', body) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { Accept: 'application/json', ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (!res.ok || j?.success === false) throw Object.assign(new Error(`Beds24: ${j?.error || j?.message || `error ${res.status}`}`), { status: res.status });
  return j || {};
}

async function exchange(env, store) {
  const code = String(env.BEDS24_INVITE_CODE || '').trim();
  const have = await store.get('auth');
  if (have?.refreshToken && have.code === code) return have;
  if (!code) throw new Error('Paste a Beds24 invite code in Set up.');
  const j = await raw('/authentication/setup', { code });
  if (!j.refreshToken) throw new Error('Beds24 did not return a refresh token -- make a new invite code with write access.');
  const auth = { refreshToken: j.refreshToken, code, at: new Date().toISOString() };
  await store.put('auth', auth);
  if (j.token) await store.put('token:live', { token: j.token, exp: Date.now() + Number(j.expiresIn || 86400) * 1000 });
  return auth;
}

async function b24(env, store, method, path, body) {
  const token = await cachedToken(store, 'token:live', async () => {
    const auth = await exchange(env, store);
    try { const j = await raw('/authentication/token', { refreshToken: auth.refreshToken }); return { token: j.token, expiresIn: j.expiresIn }; }
    catch (err) { if (err.status === 401 || err.status === 403) throw new Error('Beds24 refused the saved access -- make a new invite code and save it in Set up.'); throw err; }
  });
  return raw(path, { token }, method, body);
}

async function unitNames(env, store) {
  const p = await b24(env, store, 'GET', '/properties?includeAllRooms=true');
  const names = {};
  for (const prop of p.data || []) for (const rt of prop.roomTypes || []) {
    names[`r${rt.id}`] = String(rt.name || rt.id);
    for (const u of rt.units || []) names[`u${rt.id}:${u.id}`] = String(u.name || u.id);
  }
  return names;
}

async function inHouse(env, store) {
  const [b, names] = await Promise.all([b24(env, store, 'GET', '/bookings?filter=current'), unitNames(env, store)]);
  return (b.data || []).filter((x) => !['cancelled', 'black', 'inquiry'].includes(String(x.status).toLowerCase())).map((x) => ({
    id: String(x.id), guest: [x.firstName, x.lastName].filter(Boolean).join(' ') || 'Guest',
    rooms: [names[`u${x.roomId}:${x.unitId}`], names[`r${x.roomId}`]].filter(Boolean),
  }));
}

export default {
  id: 'beds24',
  name: 'Beds24',
  category: 'hospitality',
  status: 'available',
  color: '#2C7BE5',
  description: "Charge a sale to a guest's booking in Beds24 (hotels, guesthouses, homestays), and see who is in house.",
  docsUrl: 'https://wiki.beds24.com/index.php/Category:API_V2',
  test: { support: 'none', note: 'Beds24 has no test mode; try it on a test property or booking.' },
  secrets: [
    { name: 'BEDS24_INVITE_CODE', label: 'Beds24 invite code', hint: 'Beds24 -> Settings -> Marketplace -> API -> Generate invite code (read + write bookings, read properties). Works once; saving swaps it for lasting access.' },
  ],
  async onKeysSaved({ env, store }) {
    await exchange(env, store);
    return 'Beds24 access saved';
  },
  actions: [
    {
      id: 'test', label: 'Test Beds24', placement: ['settings'], fields: [],
      async run({ env, store }) {
        const p = await b24(env, store, 'GET', '/properties');
        const list = (p.data || []).map((x) => x.name).filter(Boolean);
        return { type: 'message', title: 'Beds24 is connected', text: list.length ? `Properties: ${list.slice(0, 5).join(', ')}.` : 'Connected (no properties found).' };
      },
    },
    {
      id: 'in_house', label: 'Guests in house', placement: ['settings'], fields: [],
      async run({ env, store }) {
        const list = await inHouse(env, store);
        return { type: 'message', title: `${list.length} guest${list.length === 1 ? '' : 's'} in house`, text: list.length ? list.slice(0, 30).map((r) => `${r.rooms[0] || '?'} ${r.guest}`).join(' · ') : 'Nobody is staying tonight.' };
      },
    },
    {
      id: 'arrivals', label: "Today's arrivals", placement: ['settings'], fields: [],
      async run({ env, store }) {
        const b = await b24(env, store, 'GET', '/bookings?filter=arrivals');
        const list = (b.data || []).filter((x) => String(x.status).toLowerCase() !== 'cancelled');
        return { type: 'message', title: `${list.length} arrival${list.length === 1 ? '' : 's'} today`, text: list.length ? list.slice(0, 30).map((x) => [x.firstName, x.lastName].filter(Boolean).join(' ')).join(' · ') : 'No arrivals today.' };
      },
    },
    {
      id: 'post_to_room', outbound: true, label: 'Charge to room (Beds24)', placement: ['transaction'],
      fields: [{ name: 'roomOrGuest', label: 'Room or guest name', type: 'text', required: true }],
      async run({ env, fields, context, store, mode }) {
        if (mode === 'test') throw new Error('Beds24 has no test mode -- switch the shop to Live to charge a room.');
        const tx = sale(context);
        const had = await store.get(`tx:${tx.id}`);
        if (had) return { type: 'status', title: 'Beds24', status: 'Already charged', text: `Sale #${tx.id} is on ${had.guest}'s bill (${had.room}).` };
        const g = matchGuest(await inHouse(env, store), fields.roomOrGuest);
        const items = folioLines(tx).map((l) => ({ type: 'charge', description: `${l.name} (Stratek #${tx.id})`.slice(0, 100), qty: l.qty, amount: l.price }));
        const r = await b24(env, store, 'POST', '/bookings', [{ id: Number(g.id), invoiceItems: items }]);
        const res = Array.isArray(r) ? r[0] : r;
        if (res && res.success === false) throw new Error(`Beds24: ${(res.errors || []).map((e) => e.message || e).join('; ') || 'charge refused'}`);
        await store.put(`tx:${tx.id}`, { booking: g.id, guest: g.guest, room: g.rooms[0] || '?', at: new Date().toISOString() });
        return { type: 'status', title: 'Charged to room', status: g.rooms[0] || 'Booking', text: `${tx.currency} ${tx.amount} is on ${g.guest}'s Beds24 bill (booking ${g.id}). A person settles the Stratek sale (the guest pays at check-out).` };
      },
    },
  ],
};
