// ms_teams -- Sale and staff alerts to a Teams channel.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Workflows / incoming webhook URL. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "ms_teams",
  name: "Microsoft Teams",
  category: "messaging",
  status: 'planned',
  description: "Sale and staff alerts to a Teams channel.",
  docsUrl: "https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook",
  secrets: [
    { name: "TEAMS_WEBHOOK_URL", label: "Teams workflow webhook URL" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Microsoft Teams",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Microsoft Teams"),
    },
    {
      id: "send",
      label: "Post sale to Microsoft Teams",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Microsoft Teams"),
    },
  ],
};
