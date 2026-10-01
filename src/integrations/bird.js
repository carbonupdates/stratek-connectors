// bird -- SMS and WhatsApp receipts through Bird.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Channels API; access key + workspace/channel IDs. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "bird",
  name: "Bird (MessageBird)",
  category: "messaging",
  status: 'planned',
  description: "SMS and WhatsApp receipts through Bird.",
  docsUrl: "https://docs.bird.com/api",
  secrets: [
    { name: "BIRD_ACCESS_KEY", label: "Access key" },
    { name: "BIRD_WORKSPACE_ID", label: "Workspace ID" },
    { name: "BIRD_CHANNEL_ID", label: "Channel ID" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Bird (MessageBird)",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Bird (MessageBird)"),
    },
    {
      id: "send_receipt",
      label: "Send receipt with Bird (MessageBird)",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Bird (MessageBird)"),
    },
  ],
};
