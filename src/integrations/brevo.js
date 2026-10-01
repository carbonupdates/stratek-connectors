// brevo -- Add customers to Brevo lists and send email receipts.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: API v3; API key. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "brevo",
  name: "Brevo",
  category: "marketing",
  status: 'planned',
  description: "Add customers to Brevo lists and send email receipts.",
  docsUrl: "https://developers.brevo.com/",
  secrets: [
    { name: "BREVO_API_KEY", label: "API key" },
    { name: "BREVO_LIST_ID", label: "List ID" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Brevo",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Brevo"),
    },
    {
      id: "add_contact",
      label: "Add customer to Brevo",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Brevo"),
    },
  ],
};
