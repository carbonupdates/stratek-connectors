// slack -- post a sale to a Slack channel with an incoming webhook.
// Buttons: Test Slack (Integrations tab); Post sale to Slack (sale details).

import { hookUrl, postJson, money, itemsLine } from './_hooks.js';
import { sale } from './_util.js';

const NAME = 'Slack';
const post = (env, text) => postJson(hookUrl(env.SLACK_WEBHOOK_URL, { name: NAME, host: /^hooks\.slack\.com$/i }), { text }, { name: NAME });

export default {
  id: 'slack',
  name: 'Slack',
  category: 'messaging',
  status: 'available',
  description: 'Post sales to a Slack channel.',
  docsUrl: 'https://api.slack.com/messaging/webhooks',
  test: { support: 'none', note: 'Sales made in Test mode are marked TEST.' },
  secrets: [
    { name: 'SLACK_WEBHOOK_URL', label: 'Slack incoming webhook URL', hint: 'Slack -> apps -> "Incoming WebHooks" (or your own Slack app -> Incoming Webhooks) -> pick a channel -> copy the URL (https://hooks.slack.com/services/...).' },
  ],
  actions: [
    {
      id: 'test', label: 'Test Slack', placement: ['settings'], fields: [],
      async run({ env }) {
        await post(env, 'Hello from Stratek. Sales you post will appear here.');
        return { type: 'message', title: 'Posted', text: 'Check your Slack channel.' };
      },
    },
    {
      id: 'notify', label: 'Post sale to Slack', placement: ['transaction'], fields: [],
      async run({ env, context, mode }) {
        const tx = sale(context);
        const items = itemsLine(tx.items);
        const text = `${mode === 'test' ? 'TEST · ' : ''}*Sale #${tx.id}* · ${money(tx.amount, tx.currency)}${tx.reference ? ` · ${String(tx.reference).slice(0, 80)}` : ''}${items ? `\n${items.slice(0, 500)}` : ''}`;
        await post(env, text);
        return { type: 'message', title: 'Posted to Slack', text: `Sale #${tx.id}.` };
      },
    },
  ],
};
