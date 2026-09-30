// webhook -- send a sale (or your inventory) as JSON to any https address you choose,
// e.g. your own system, n8n, Pipedream. Optional signing secret: each request carries
// X-Stratek-Signature: t=<unix>,v1=<hex HMAC-SHA256 of "<t>.<body>"> (see _hooks.js).
// Buttons: Test webhook, Send inventory to webhook (Integrations tab); Send sale to webhook (sale details).

import { hookUrl, salePayload, postJson } from './_hooks.js';

const NAME = 'Webhook';
const send = (env, payload) => postJson(hookUrl(env.WEBHOOK_URL, { name: NAME }), payload, { name: NAME, secret: env.WEBHOOK_SECRET || '' });

export default {
  id: 'webhook',
  name: 'Webhook',
  category: 'automation',
  status: 'available',
  description: 'Send a sale or your inventory as JSON to any address you choose (your own system, n8n, Pipedream...).',
  docsUrl: 'https://github.com/carbonupdates/stratek-connectors#webhook',
  test: { support: 'none', note: 'Your webhook address receives mode "test" for sales made in Test mode.' },
  secrets: [
    { name: 'WEBHOOK_URL', label: 'Webhook address (https://)', hint: 'Where each sale is sent as JSON (POST).' },
    { name: 'WEBHOOK_SECRET', label: 'Signing secret', hint: 'Optional. Any long random text; each request is signed with it (X-Stratek-Signature) so your receiver can check it came from you.', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test webhook', placement: ['settings'], fields: [],
      async run({ env, mode, claims }) {
        const r = await send(env, { ...salePayload({ context: {}, mode, claims, type: 'test' }), message: 'Hello from Stratek' });
        return { type: 'message', title: 'Webhook answered', text: `Your address answered ${r.status}.${env.WEBHOOK_SECRET ? ' Requests are signed.' : ''}` };
      },
    },
    {
      id: 'send_inventory', label: 'Send inventory to webhook', placement: ['settings'], context: ['menu'], fields: [],
      async run({ env, context, mode, claims }) {
        const p = salePayload({ context, mode, claims, type: 'inventory' });
        await send(env, p);
        return { type: 'message', title: 'Inventory sent', text: `${p.inventory.items.length} items sent to your webhook.` };
      },
    },
    {
      id: 'send', label: 'Send sale to webhook', placement: ['transaction'], fields: [],
      async run({ env, context, mode, claims }) {
        const p = salePayload({ context, mode, claims });
        await send(env, p);
        return { type: 'message', title: 'Sent', text: `Sale #${p.sale.id} sent to your webhook.` };
      },
    },
  ],
};
