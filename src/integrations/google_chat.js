// google_chat -- Sale and staff alerts to a Google Chat space.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Space webhook URL. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "google_chat",
  name: "Google Chat",
  category: "messaging",
  status: 'planned',
  description: "Sale and staff alerts to a Google Chat space.",
  docsUrl: "https://developers.google.com/workspace/chat/quickstart/webhooks",
  secrets: [
    { name: "GOOGLE_CHAT_WEBHOOK_URL", label: "Google Chat webhook URL" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Google Chat",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Google Chat"),
    },
    {
      id: "send",
      label: "Post sale to Google Chat",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Google Chat"),
    },
  ],
};
