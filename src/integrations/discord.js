// discord -- Sale and staff alerts to a Discord channel.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Channel webhook URL. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "discord",
  name: "Discord",
  category: "messaging",
  status: 'planned',
  description: "Sale and staff alerts to a Discord channel.",
  docsUrl: "https://discord.com/developers/docs/resources/webhook",
  secrets: [
    { name: "DISCORD_WEBHOOK_URL", label: "Discord webhook URL" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Discord",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Discord"),
    },
    {
      id: "send",
      label: "Post sale to Discord",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Discord"),
    },
  ],
};
