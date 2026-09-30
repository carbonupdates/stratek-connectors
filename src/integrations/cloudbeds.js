// cloudbeds -- charge a restaurant, bar, spa or shop sale to a hotel guest's room in
// Cloudbeds, and see who is in house / arriving today.
// Cloudbeds -> Account -> Apps & Marketplace -> API credentials -> create a property API
// key (self-service API access). Scopes: read:hotel, read:reservation, write:item.
//   API: https://api.cloudbeds.com/api/v1.2 (header x-api-key)
//        GET /getHotelDetails, GET /getReservations (status=checked_in / checkInFrom),
//        POST /postCustomItem (form data; referenceID stops a double charge)
// Buttons: Test Cloudbeds, Guests in house, Today's arrivals (Integrations tab);
// Charge to room (sale details -- needs a person, it bills a guest).
// Nothing is settled automatically: the guest pays the hotel at check-out, and a person
// settles the Stratek sale.

import { sale } from './_util.js';
import { readJson } from './_ship.js';

const BASE = 'https://api.cloudbeds.com/api/v1.2';
const pid = (env) => String(env.CLOUDBEDS_PROPERTY_ID || '').trim();

async function cb(env, method, path, params) {
  const q = method === 'GET' ? `?${new URLSearchParams({ propertyID: pid(env), ...params })}` : '';
  const res = await fetch(`${BASE}${path}${q}`, { method, headers: { 'x-api-key': String(env.CLOUDBEDS_API_KEY).trim(), Accept: 'application/json', ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) }, body: method === 'POST' ? new URLSearchParams(params) : undefined });
  const j = await readJson(res);
  if (res.status === 401 || res.status === 403) throw new Error('Cloudbeds did not accept the API key (it needs read:hotel, read:reservation and write:item).');
  if (!res.ok || j?.success === false) throw new Error(`Cloudbeds: ${j?.message || `error ${res.status}`}`);
  return j;
}

/** In-house reservations with their room names. */
async function inHouse(env) {
  const j = await cb(env, 'GET', '/getReservations', { status: 'checked_in', includeGuestsDetails: 'true', pageSize: '100' });
  return (j.data || []).map((r) => {
    const rooms = new Set();
    for (const g of Object.values(r.guestList || {})) for (const rm of [].concat(g.rooms || [])) if (rm?.roomName) rooms.add(String(rm.roomName));
    for (const rm of [].concat(r.rooms || [])) if (rm?.roomName) rooms.add(String(rm.roomName));
    return { id: String(r.reservationID), guest: String(r.guestName || ''), rooms: [...rooms] };
  });
}

export function matchGuest(list, q) {
  const s = String(q || '').trim().toLowerCase();
  if (!s) throw new Error('Enter the room number or the guest name.');
  const byRoom = list.filter((r) => r.rooms.some((n) => n.toLowerCase() === s || n.toLowerCase().replace(/^room\s*/, '') === s));
  const hits = byRoom.length ? byRoom : list.filter((r) => r.guest.toLowerCase().includes(s));
  if (!hits.length) throw new Error(`No checked-in guest matches "${q}".`);
  if (hits.length > 1) throw new Error(`"${q}" matches ${hits.length} guests (${hits.slice(0, 4).map((h) => `${h.guest} ${h.rooms.join('/')}`).join(', ')}). Use the room number.`);
  return hits[0];
}

/** Sale lines for the folio, plus one line for tax / service / rounding so the total matches the bill. */
export function folioLines(tx) {
  const items = (tx.items || []).map((i) => ({ name: String(i.name).slice(0, 100), price: Number(i.price), qty: Number(i.qty || 1) }));
  const sum = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
  const diff = Math.round((Number(tx.amount) - sum) * 100) / 100;
  if (!items.length || diff < 0) return [{ name: `Sale #${tx.id}`, price: Number(tx.amount), qty: 1 }];
  return diff > 0 ? [...items, { name: 'VAT, service & rounding', price: diff, qty: 1 }] : items;
}

export default {
  id: 'cloudbeds',
  name: 'Cloudbeds',
  category: 'hospitality',
  status: 'available',
  color: '#1C4BDB',
  description: "Hotel PMS: charge a restaurant, bar or shop sale to a guest's room, and see who is in house.",
  docsUrl: 'https://developers.cloudbeds.com/',
  test: { support: 'none', note: 'Cloudbeds has no test mode; ask Cloudbeds for a demo property to try it.' },
  secrets: [
    { name: 'CLOUDBEDS_API_KEY', label: 'Cloudbeds API key', hint: 'Cloudbeds -> Apps & Marketplace -> API credentials -> new key (read:hotel, read:reservation, write:item).' },
    { name: 'CLOUDBEDS_PROPERTY_ID', label: 'Property ID', hint: 'Shown next to the API key; "Test Cloudbeds" confirms it.' },
  ],
  actions: [
    {
      id: 'test', label: 'Test Cloudbeds', placement: ['settings'], fields: [],
      async run({ env }) {
        const h = (await cb(env, 'GET', '/getHotelDetails', {})).data || {};
        return { type: 'message', title: 'Cloudbeds is connected', text: `${h.propertyName || 'Property'} (${h.propertyCurrency?.currencyCode || h.propertyCurrency || '?'}).` };
      },
    },
    {
      id: 'in_house', label: 'Guests in house', placement: ['settings'], fields: [],
      async run({ env }) {
        const list = await inHouse(env);
        return { type: 'message', title: `${list.length} guest${list.length === 1 ? '' : 's'} in house`, text: list.length ? list.slice(0, 30).map((r) => `${r.rooms.join('/') || '?'} ${r.guest}`).join(' · ') : 'Nobody is checked in.' };
      },
    },
    {
      id: 'arrivals', label: "Today's arrivals", placement: ['settings'], fields: [],
      async run({ env }) {
        const today = new Date(Date.now() + 345 * 60000).toISOString().slice(0, 10);
        const j = await cb(env, 'GET', '/getReservations', { checkInFrom: today, checkInTo: today, status: 'confirmed', pageSize: '100' });
        const list = j.data || [];
        return { type: 'message', title: `${list.length} arrival${list.length === 1 ? '' : 's'} today`, text: list.length ? list.slice(0, 30).map((r) => r.guestName).join(' · ') : 'No arrivals today.' };
      },
    },
    {
      id: 'post_to_room', outbound: true, label: 'Charge to room (Cloudbeds)', placement: ['transaction'],
      fields: [{ name: 'roomOrGuest', label: 'Room number or guest name', type: 'text', required: true }],
      async run({ env, fields, context, store, mode }) {
        if (mode === 'test') throw new Error('Cloudbeds has no test mode -- switch the shop to Live to charge a room.');
        const tx = sale(context);
        const had = await store.get(`tx:${tx.id}`);
        if (had) return { type: 'status', title: 'Cloudbeds', status: 'Already charged', text: `Sale #${tx.id} is on ${had.guest}'s bill (room ${had.room}).` };
        const g = matchGuest(await inHouse(env), fields.roomOrGuest);
        const lines = folioLines(tx);
        const form = { propertyID: pid(env), reservationID: g.id, referenceID: `stratek-${tx.id}`, itemPaid: 'false' };
        lines.forEach((l, n) => Object.assign(form, { [`items[${n}][appItemID]`]: `stratek-${tx.id}-${n + 1}`, [`items[${n}][itemName]`]: l.name, [`items[${n}][itemPrice]`]: String(l.price), [`items[${n}][itemQuantity]`]: String(l.qty), [`items[${n}][itemNote]`]: `Stratek sale #${tx.id}`, [`items[${n}][itemCategoryName]`]: 'Food & beverage' }));
        await cb(env, 'POST', '/postCustomItem', form);
        const room = g.rooms.join('/') || '?';
        await store.put(`tx:${tx.id}`, { reservation: g.id, guest: g.guest, room, at: new Date().toISOString() });
        return { type: 'status', title: 'Charged to room', status: `Room ${room}`, text: `${tx.currency} ${tx.amount} is on ${g.guest}'s Cloudbeds bill. A person settles the Stratek sale (the guest pays the hotel at check-out).` };
      },
    },
  ],
};
