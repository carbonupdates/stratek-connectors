// vonage -- SMS receipts worldwide through Vonage.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: SMS API; API key + secret. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "vonage",
  name: "Vonage SMS",
  category: "messaging",
  status: 'planned',
  description: "SMS receipts worldwide through Vonage.",
  docsUrl: "https://developer.vonage.com/en/messaging/sms/overview",
  secrets: [
    { name: "VONAGE_API_KEY", label: "API key" },
    { name: "VONAGE_API_SECRET", label: "API secret" },
    { name: "VONAGE_FROM", label: "Sender ID / number" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Vonage SMS",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Vonage SMS"),
    },
    {
      id: "send_receipt",
      label: "Send receipt with Vonage SMS",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Vonage SMS"),
    },
  ],
};
