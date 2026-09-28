// webhook -- Send each sale to any address you choose (for your own systems).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "webhook",
  name: "Webhook",
  category: "automation",
  status: 'planned',
  description: "Send each sale to any address you choose (for your own systems).",
  docsUrl: null,
  secrets: [
    {
      name: "WEBHOOK_URL",
      label: "Webhook address (https://)"
    },
    {
      name: "WEBHOOK_SECRET",
      label: "Signing secret",
      hint: "Used to sign each request so the receiver can check it came from you.",
      optional: true
    }
  ],
  actions: [
    {
      id: "send",
      label: "Send sale to webhook",
      placement: [
        "transaction",
        "charge"
      ],
      fields: [],
      run: notBuilt("Webhook"),
    },
  ],
};
