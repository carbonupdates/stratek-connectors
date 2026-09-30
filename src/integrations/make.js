// make -- send a sale to a Make (make.com) custom webhook, then build a scenario on it.
// Same JSON as Webhook. Buttons: Test Make (Integrations tab); Send sale to Make (sale details).

import { hookUrl, salePayload, postJson } from './_hooks.js';

const NAME = 'Make';
const send = (env, payload) => postJson(hookUrl(env.MAKE_WEBHOOK_URL, { name: NAME, host: /(^|\.)make\.com$/i }), payload, { name: NAME });

export default {
  id: 'make',
  name: 'Make',
  category: 'automation',
  status: 'available',
  description: 'Send sales to a Make scenario (custom webhook) and automate the rest.',
  docsUrl: 'https://www.make.com/en/help/tools/webhooks',
  test: { support: 'none', note: 'Sales made in Test mode arrive with mode "test".' },
  secrets: [
    { name: 'MAKE_WEBHOOK_URL', label: 'Make webhook URL', hint: 'In Make: add the "Webhooks -> Custom webhook" module, create a webhook and copy its address (https://hook.<region>.make.com/...).' },
  ],
  actions: [
    {
      id: 'test', label: 'Test Make', placement: ['settings'], fields: [],
      async run({ env, mode, claims }) {
        await send(env, { ...salePayload({ context: {}, mode, claims, type: 'test' }), message: 'Hello from Stratek' });
        return { type: 'message', title: 'Make received it', text: 'If the scenario was listening ("Run once"), it now knows the data structure.' };
      },
    },
    {
      id: 'send', label: 'Send sale to Make', placement: ['transaction'], fields: [],
      async run({ env, context, mode, claims }) {
        const p = salePayload({ context, mode, claims });
        await send(env, p);
        return { type: 'message', title: 'Sent to Make', text: `Sale #${p.sale.id} sent.` };
      },
    },
  ],
};
