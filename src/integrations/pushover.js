// pushover -- Push alerts to the owner's phone.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Messages API; app token + user key. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "pushover",
  name: "Pushover",
  category: "messaging",
  status: 'planned',
  description: "Push alerts to the owner's phone.",
  docsUrl: "https://pushover.net/api",
  secrets: [
    { name: "PUSHOVER_APP_TOKEN", label: "Application token" },
    { name: "PUSHOVER_USER_KEY", label: "User key" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Pushover",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Pushover"),
    },
    {
      id: "send",
      label: "Post sale to Pushover",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Pushover"),
    },
  ],
};
