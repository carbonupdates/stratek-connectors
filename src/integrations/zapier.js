// zapier -- send a sale to a Zapier "Catch Hook" (Webhooks by Zapier trigger), then do
// anything with it in Zapier (Gmail, Sheets, Notion, CRMs...). Same JSON as Webhook.
// Buttons: Test Zapier (Integrations tab); Send sale to Zapier (sale details).

import { hookUrl, salePayload, postJson } from './_hooks.js';

const NAME = 'Zapier';
const send = (env, payload) => postJson(hookUrl(env.ZAPIER_HOOK_URL, { name: NAME, host: /(^|\.)zapier\.com$/i }), payload, { name: NAME });

export default {
  id: 'zapier',
  name: 'Zapier',
  category: 'automation',
  status: 'available',
  description: 'Send sales to a Zapier catch hook and connect them to thousands of apps.',
  docsUrl: 'https://help.zapier.com/hc/en-us/articles/8496288690317',
  test: { support: 'none', note: 'Sales made in Test mode arrive with mode "test".' },
  secrets: [
    { name: 'ZAPIER_HOOK_URL', label: 'Zapier catch hook URL', hint: 'In Zapier: create a Zap -> trigger "Webhooks by Zapier" -> "Catch Hook" -> copy the URL (https://hooks.zapier.com/...).' },
  ],
  actions: [
    {
      id: 'test', label: 'Test Zapier', placement: ['settings'], fields: [],
      async run({ env, mode, claims }) {
        await send(env, { ...salePayload({ context: {}, mode, claims, type: 'test' }), message: 'Hello from Stratek' });
        return { type: 'message', title: 'Zapier received it', text: 'Press "Test trigger" in your Zap to see the sample.' };
      },
    },
    {
      id: 'send', label: 'Send sale to Zapier', placement: ['transaction'], fields: [],
      async run({ env, context, mode, claims }) {
        const p = salePayload({ context, mode, claims });
        await send(env, p);
        return { type: 'message', title: 'Sent to Zapier', text: `Sale #${p.sale.id} sent.` };
      },
    },
  ],
};
