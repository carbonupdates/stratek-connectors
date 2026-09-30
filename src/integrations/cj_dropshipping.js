// cj_dropshipping -- CJdropshipping: find products, and have CJ pack and ship a sale's items
// to the customer from its warehouses (paid from your CJ balance).
// CJdropshipping -> My CJ -> Authorization -> API -> generate an API key.
// Products are matched by CJ variant SKU (e.g. CJNS1234567-Black-L): use them as your
// Stratek item SKUs, or type them on the button.
//   API: https://developers.cjdropshipping.com/api2.0/v1 (header CJ-Access-Token)
//        POST /authentication/getAccessToken {apiKey}, GET /shopping/balance (test),
//        GET /product/list, POST /shopping/order/createOrderV2 (payType 3 = create only,
//        2 = pay from balance), POST /shopping/pay/payBalanceV2, GET /shopping/order/getOrderDetail
// Buttons: Test CJ, Find CJ products (Integrations tab); Price CJ order (creates an unpaid
// CJ order and shows the total), Confirm CJ order (needs a person -- pays from your CJ
// balance), Track CJ order (sale details).

import { sale } from './_util.js';
import { recipientFields, recipient, skuLines, skuField, shipmentFor, rememberShipment, noShipment, readJson, cachedToken } from './_ship.js';

const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';

async function token(env, store) {
  return cachedToken(store, 'token', async () => {
    const res = await fetch(`${BASE}/authentication/getAccessToken`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: String(env.CJ_API_KEY).trim() }) });
    const j = await readJson(res);
    if (!res.ok || !j?.result || !j?.data?.accessToken) throw new Error(`CJdropshipping did not accept the API key${j?.message ? ` (${j.message})` : ''}.`);
    const exp = Date.parse(j.data.accessTokenExpiryDate || '');
    return { token: j.data.accessToken, expiresIn: Number.isFinite(exp) ? Math.max(3600, (exp - Date.now()) / 1000) : 7 * 86400 };
  });
}

async function cj(env, store, method, path, body) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { 'CJ-Access-Token': await token(env, store), Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await readJson(res);
  if (res.status === 429 || j?.code === 1600200) throw new Error('CJdropshipping: too many requests (1 per second) -- try again in a moment.');
  if (!res.ok || j?.result === false) throw new Error(`CJdropshipping: ${j?.message || `error ${res.status}`}`);
  return j?.data;
}

const orderFields = [...recipientFields({ state: true, weight: false }), skuField, { name: 'logisticName', label: 'Shipping method (optional, e.g. CJPacket Ordinary)', type: 'text' }];

function orderBody(env, fields, context, tx, payType) {
  const to = recipient(fields, context);
  return {
    orderNumber: `stratek-${tx.id}`, shippingCountryCode: to.country, shippingCountry: to.country, shippingProvince: to.state || to.city,
    shippingCity: to.city, shippingAddress: to.address, shippingCustomerName: to.name, shippingPhone: to.phone, shippingZip: to.postalCode || '',
    ...(to.email ? { email: to.email } : {}), remark: `Stratek sale #${tx.id}`,
    logisticName: String(fields.logisticName || env.CJ_LOGISTIC_NAME || 'CJPacket Ordinary').trim(), fromCountryCode: String(env.CJ_FROM_COUNTRY || 'CN').trim().toUpperCase(),
    payType, products: skuLines(fields.skus, tx).map((l) => ({ sku: l.sku, quantity: l.qty })),
  };
}
const amounts = (o) => `total USD ${o.orderAmount ?? '?'} (products ${o.productAmount ?? '?'}, shipping ${o.postageAmount ?? '?'})`;

export default {
  id: 'cj_dropshipping',
  name: 'CJdropshipping',
  category: 'sourcing',
  status: 'available',
  color: '#F28C28',
  description: 'Find products and have CJdropshipping pack and ship a sale to the customer.',
  docsUrl: 'https://developers.cjdropshipping.com/',
  test: { support: 'none', note: 'CJ has no test mode: "Price CJ order" creates an unpaid order; only "Confirm" pays from your CJ balance.' },
  secrets: [
    { name: 'CJ_API_KEY', label: 'CJ API key', hint: 'CJdropshipping -> My CJ -> Authorization -> API -> Generate.' },
    { name: 'CJ_LOGISTIC_NAME', label: 'Default shipping method', hint: 'Optional, default CJPacket Ordinary.', optional: true },
    { name: 'CJ_FROM_COUNTRY', label: 'Ship from (warehouse country)', hint: 'Optional, default CN.', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test CJ', placement: ['settings'], fields: [],
      async run({ env, store }) {
        const b = await cj(env, store, 'GET', '/shopping/balance');
        return { type: 'message', title: 'CJdropshipping is connected', text: `Balance: USD ${b?.amount ?? b?.balance ?? '?'}.` };
      },
    },
    {
      id: 'find_products', label: 'Find CJ products', placement: ['settings'], fields: [{ name: 'query', label: 'Product name (English)', type: 'text', required: true }],
      async run({ env, store, fields }) {
        const q = String(fields.query || '').trim().slice(0, 100);
        if (!q) throw new Error('Type what to look for.');
        const d = await cj(env, store, 'GET', `/product/list?${new URLSearchParams({ productNameEn: q, pageNum: '1', pageSize: '8' })}`);
        const list = d?.list || [];
        return { type: 'message', title: `CJ products for "${q}"`, text: list.length ? list.map((p) => `${String(p.productNameEn).slice(0, 60)} -- SKU ${p.productSku}, USD ${p.sellPrice}`).join(' · ') : 'Nothing found.' };
      },
    },
    {
      id: 'quote', label: 'Price CJ order', placement: ['transaction'], fields: orderFields,
      async run({ env, fields, context, store }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (had?.orderId) {
          const o = await cj(env, store, 'GET', `/shopping/order/getOrderDetail?orderId=${encodeURIComponent(had.orderId)}`);
          return { type: 'message', title: 'CJ order (unpaid)', text: `Order ${had.orderId}: ${amounts(o || {})}. Press "Confirm CJ order" to pay from your balance.` };
        }
        const o = await cj(env, store, 'POST', '/shopping/order/createOrderV2', orderBody(env, fields, context, tx, 3));
        await rememberShipment(store, tx, { orderId: o.orderId, paid: false });
        return { type: 'message', title: 'CJ order (unpaid)', text: `Order ${o.orderId}: ${amounts(o)}. Nothing is paid yet -- press "Confirm CJ order" to pay from your balance.` };
      },
    },
    {
      id: 'confirm_order', outbound: true, label: 'Confirm CJ order', placement: ['transaction'], fields: orderFields,
      async run({ env, fields, context, store }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (had?.paid) return { type: 'status', title: 'CJdropshipping', status: 'Already paid', text: `Order ${had.orderId}.` };
        let orderId = had?.orderId; let o;
        if (orderId) await cj(env, store, 'POST', '/shopping/pay/payBalanceV2', { orderId });
        else { o = await cj(env, store, 'POST', '/shopping/order/createOrderV2', orderBody(env, fields, context, tx, 2)); orderId = o.orderId; }
        await rememberShipment(store, tx, { orderId, paid: true });
        return { type: 'status', title: 'CJdropshipping', status: 'Paid', text: `Order ${orderId} paid from your CJ balance${o ? ` -- ${amounts(o)}` : ''}. CJ packs and ships it.` };
      },
    },
    {
      id: 'track', label: 'Track CJ order', placement: ['transaction'], fields: [],
      async run({ env, context, store }) {
        const tx = sale(context);
        const had = await shipmentFor(store, tx);
        if (!had?.orderId) return noShipment('CJdropshipping');
        const o = (await cj(env, store, 'GET', `/shopping/order/getOrderDetail?orderId=${encodeURIComponent(had.orderId)}`)) || {};
        return { type: 'status', title: `CJ order ${had.orderId}`, status: o.orderStatus || (had.paid ? 'Paid' : 'Unpaid'), text: [o.logisticName, o.trackNumber].filter(Boolean).join(' · ') || 'Not shipped yet.' };
      },
    },
  ],
};
