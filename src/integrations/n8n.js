// n8n -- send a sale (or your inventory) to an n8n workflow (n8n Cloud or self-hosted),
// then automate anything with it. Same JSON as Webhook.
// In n8n: add a "Webhook" trigger node (POST), copy its Production URL. Optional: set the
// node's authentication to "Header Auth" and put the same header name / value here.
// Buttons: Test n8n, Send inventory to n8n (Integrations tab); Send sale to n8n (sale details).

import { hookUrl, salePayload, postJson } from './_hooks.js';

const NAME = 'n8n';
function send(env, payload) {
  const h = String(env.N8N_HEADER_NAME || '').trim();
  if (h && !/^[A-Za-z0-9-]{1,60}$/.test(h)) throw new Error('n8n: the header name can only have letters, numbers and dashes.');
  return postJson(hookUrl(env.N8N_WEBHOOK_URL, { name: NAME }), payload, { name: NAME, headers: h ? { [h]: String(env.N8N_HEADER_VALUE || '') } : {} });
}

export default {
  id: 'n8n',
  name: 'n8n',
  category: 'automation',
  status: 'available',
  color: '#EA4B71',
  description: 'Send sales and inventory to an n8n workflow (cloud or self-hosted).',
  docsUrl: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/',
  test: { support: 'none', note: 'Sales made in Test mode arrive with mode "test". Use the Webhook node\'s Test URL here while building.' },
  secrets: [
    { name: 'N8N_WEBHOOK_URL', label: 'n8n webhook URL', hint: 'n8n -> Webhook trigger node (POST) -> Production URL (https://...).' },
    { name: 'N8N_HEADER_NAME', label: 'Header name (Header Auth)', hint: 'Optional, e.g. X-Stratek-Key -- the same as in the Webhook node.', optional: true },
    { name: 'N8N_HEADER_VALUE', label: 'Header value (Header Auth)', optional: true },
  ],
  actions: [
    {
      id: 'test', label: 'Test n8n', placement: ['settings'], fields: [],
      async run({ env, mode, claims }) {
        await send(env, { ...salePayload({ context: {}, mode, claims, type: 'test' }), message: 'Hello from Stratek' });
        return { type: 'message', title: 'n8n received it', text: 'Open the workflow\'s executions to see the sample.' };
      },
    },
    {
      id: 'send_inventory', label: 'Send inventory to n8n', placement: ['settings'], context: ['menu'], fields: [],
      async run({ env, context, mode, claims }) {
        const p = salePayload({ context, mode, claims, type: 'inventory' });
        await send(env, p);
        return { type: 'message', title: 'Sent to n8n', text: `${p.inventory.items.length} items sent.` };
      },
    },
    {
      id: 'send', label: 'Send sale to n8n', placement: ['transaction'], fields: [],
      async run({ env, context, mode, claims }) {
        const p = salePayload({ context, mode, claims });
        await send(env, p);
        return { type: 'message', title: 'Sent to n8n', text: `Sale #${p.sale.id} sent.` };
      },
    },
  ],
};
