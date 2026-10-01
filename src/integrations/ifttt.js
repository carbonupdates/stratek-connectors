// ifttt -- Send sales to IFTTT applets (Webhooks service).
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Webhooks key + event name. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "ifttt",
  name: "IFTTT",
  category: "automation",
  status: 'planned',
  description: "Send sales to IFTTT applets (Webhooks service).",
  docsUrl: "https://ifttt.com/maker_webhooks",
  secrets: [
    { name: "IFTTT_KEY", label: "Webhooks key" },
    { name: "IFTTT_EVENT", label: "Event name" },
  ],
  actions: [
    {
      id: "test",
      label: "Test IFTTT",
      placement: ["settings"],
      fields: [],
      run: notBuilt("IFTTT"),
    },
    {
      id: "send",
      label: "Send sale to IFTTT",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("IFTTT"),
    },
  ],
};
