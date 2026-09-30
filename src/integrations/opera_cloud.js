// opera_cloud -- charge a restaurant, bar, spa or shop sale to a guest's room in Oracle
// OPERA Cloud, through the hotel's own Oracle Hospitality Integration Platform (OHIP).
// The hotel (or its chain) registers an application in the OHIP developer portal and gives
// it the Cashiering + Reservations APIs, an integration user with a cashier ID and a
// transaction code for outlet revenue (e.g. 2000 Food). OHIP gives the gateway URL,
// app key, client ID / secret and enterprise ID.
//   Token: POST {gateway}/oauth/v1/tokens (client_credentials, basic client:secret,
//          headers x-app-key + enterpriseId)
//   API:   GET  {gateway}/rsv/v1/hotels/{hotelId}/reservations?searchType=InHouse&roomId=
//          POST {gateway}/csh/v1/hotels/{hotelId}/reservations/{id}/charges
// Buttons: Test OPERA Cloud (Integrations tab); Charge to room (sale details -- needs a person).
// Test mode uses the hotel's OHIP sandbox gateway (saved under Test keys).

import { sale } from './_util.js';
import { readJson, cachedToken } from './_ship.js';

function gateway(env) {
  let u; try { u = new URL(String(env.OHIP_GATEWAY_URL || '').trim()); } catch { throw new Error('OPERA Cloud: paste the OHIP gateway URL (https://...) in Set up.'); }
  if (u.protocol !== 'https:') throw new Error('OPERA Cloud: the gateway URL must start with https://');
  return u.origin;
}
const hotel = (env) => String(env.OHIP_HOTEL_ID || '').trim().toUpperCase();

async function token(env, store, mode) {
  return cachedToken(store, `token:${mode}`, async () => {
    const res = await fetch(`${gateway(env)}/oauth/v1/tokens`, { method: 'POST', headers: { Authorization: `Basic ${btoa(`${String(env.OHIP_CLIENT_ID).trim()}:${String(env.OHIP_CLIENT_SECRET).trim()}`)}`, 'x-app-key': String(env.OHIP_APP_KEY).trim(), enterpriseId: String(env.OHIP_ENTERPRISE_ID || '').trim(), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'urn:opc:hgbu:ws:__myscopes__' }) });
    const j = await readJson(res);
    if (!res.ok || !j?.access_token) throw new Error(`OPERA Cloud (OHIP) refused the login: ${j?.error_description || j?.title || `error ${res.status}`}.`);
    return { token: j.access_token, expiresIn: j.expires_in };
  });
}

async function oh(env, store, mode, method, path, body) {
  const res = await fetch(`${gateway(env)}${path}`, { method, headers: { Authorization: `Bearer ${await token(env, store, mode)}`, 'x-app-key': String(env.OHIP_APP_KEY).trim(), 'x-hotelid': hotel(env), Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (!res.ok) throw new Error(`OPERA Cloud: ${j?.detail || j?.title || j?.['o:errorDetails']?.[0]?.detail || `error ${res.status}`}`);
  return j;
}

const guestName = (r) => { const n = r.reservationGuest || r.reservationGuests?.[0]?.profileInfo?.profile?.customer?.personName?.[0] || {}; return [n.givenName, n.surname].filter(Boolean).join(' ') || r.reservationGuest?.fullName || 'Guest'; };

export default {
  id: 'opera_cloud',
  name: 'Oracle OPERA Cloud',
  category: 'hospitality',
  status: 'available',
  color: '#C74634',
  description: "Charge a restaurant, bar or shop sale to a guest's room in OPERA Cloud (hotel's own OHIP access).",
  docsUrl: 'https://docs.oracle.com/en/industries/hospitality/integration-platform/',
  test: { support: 'sandbox', note: 'Save the hotel\'s OHIP sandbox gateway and keys under Test keys.' },
  secrets: [
    { name: 'OHIP_GATEWAY_URL', label: 'OHIP gateway URL', hint: 'From the OHIP developer portal, e.g. https://xxxx-hospitality-api.oracleindustry.com' },
    { name: 'OHIP_APP_KEY', label: 'OHIP app key' },
    { name: 'OHIP_CLIENT_ID', label: 'OHIP client ID' },
    { name: 'OHIP_CLIENT_SECRET', label: 'OHIP client secret' },
    { name: 'OHIP_ENTERPRISE_ID', label: 'Enterprise ID' },
    { name: 'OHIP_HOTEL_ID', label: 'Hotel ID (property code)', hint: 'e.g. KTMHOTEL' },
    { name: 'OHIP_TRANSACTION_CODE', label: 'Transaction code for this outlet', hint: 'The revenue code OPERA uses for this restaurant / bar / shop, e.g. 2000.' },
    { name: 'OHIP_CASHIER_ID', label: 'Cashier ID', hint: 'Optional: the cashier of the integration user.', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test OPERA Cloud', placement: ['settings'], fields: [],
      async run({ env, store, mode }) {
        const j = await oh(env, store, mode, 'GET', `/rsv/v1/hotels/${encodeURIComponent(hotel(env))}/reservations?searchType=InHouse&limit=50`);
        const n = j.reservations?.totalResults ?? (j.reservations?.reservationInfo || []).length;
        return { type: 'message', title: 'OPERA Cloud is connected', text: `Hotel ${hotel(env)}: ${n} reservation${n === 1 ? '' : 's'} in house${mode === 'test' ? ' (sandbox)' : ''}.` };
      },
    },
    {
      id: 'post_to_room', outbound: true, label: 'Charge to room (OPERA)', placement: ['transaction'],
      fields: [{ name: 'room', label: 'Room number', type: 'text', required: true }],
      async run({ env, fields, context, store, mode }) {
        const tx = sale(context);
        const had = await store.get(`tx:${tx.id}`);
        if (had) return { type: 'status', title: 'OPERA Cloud', status: 'Already charged', text: `Sale #${tx.id} is on room ${had.room} (posting ${had.posting}).` };
        const room = String(fields.room || '').trim();
        if (!/^[A-Za-z0-9-]{1,10}$/.test(room)) throw new Error('Enter the room number.');
        const code = String(env.OHIP_TRANSACTION_CODE || '').trim();
        if (!code) throw new Error('Set the transaction code for this outlet in Set up first.');
        const h = encodeURIComponent(hotel(env));
        const found = await oh(env, store, mode, 'GET', `/rsv/v1/hotels/${h}/reservations?searchType=InHouse&roomId=${encodeURIComponent(room)}`);
        const list = found.reservations?.reservationInfo || [];
        if (!list.length) throw new Error(`No in-house guest in room ${room}.`);
        if (list.length > 1) throw new Error(`Room ${room} has ${list.length} in-house reservations -- charge it in OPERA.`);
        const r = list[0];
        const id = (r.reservationIdList || []).find((x) => x.type === 'Reservation')?.id || r.reservationIdList?.[0]?.id;
        const res = await oh(env, store, mode, 'POST', `/csh/v1/hotels/${h}/reservations/${encodeURIComponent(id)}/charges`, {
          criteria: {
            hotelId: hotel(env), postIt: true,
            ...(env.OHIP_CASHIER_ID ? { cashierId: Number(env.OHIP_CASHIER_ID) } : {}),
            charges: [{ transactionCode: code, price: { amount: Number(tx.amount), currencyCode: tx.currency }, postingQuantity: 1, postingReference: `Stratek ${tx.id}`, postingRemark: (tx.items || []).map((i) => `${i.qty || 1}x ${i.name}`).join(', ').slice(0, 200) || `Sale #${tx.id}` }],
          },
        });
        const posting = res.postings?.[0]?.transactionNo || 'posted';
        await store.put(`tx:${tx.id}`, { room, reservation: id, posting, at: new Date().toISOString() });
        return { type: 'status', title: 'Charged to room', status: `Room ${room}`, text: `${tx.currency} ${tx.amount} is on ${guestName(r)}'s OPERA folio (posting ${posting})${mode === 'test' ? ' -- sandbox' : ''}. A person settles the Stratek sale (the guest pays the hotel at check-out).` };
      },
    },
  ],
};
