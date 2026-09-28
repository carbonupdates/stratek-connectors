// slack -- Sale alerts to a Slack channel.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "slack",
  name: "Slack",
  category: "messaging",
  status: 'planned',
  description: "Sale alerts to a Slack channel.",
  docsUrl: "https://api.slack.com/messaging/webhooks",
  secrets: [
    {
      name: "SLACK_WEBHOOK_URL",
      label: "Slack incoming webhook URL"
    }
  ],
  actions: [
    {
      id: "notify",
      label: "Post sale to Slack",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("Slack"),
    },
  ],
};
