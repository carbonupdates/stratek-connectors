// klaviyo -- Add customers to Klaviyo and send sale events for your email / SMS flows.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: API (revisioned); private API key. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "klaviyo",
  name: "Klaviyo",
  category: "marketing",
  status: 'planned',
  description: "Add customers to Klaviyo and send sale events for your email / SMS flows.",
  docsUrl: "https://developers.klaviyo.com/",
  secrets: [
    { name: "KLAVIYO_PRIVATE_KEY", label: "Private API key" },
    { name: "KLAVIYO_LIST_ID", label: "List ID (optional)", optional: true },
  ],
  actions: [
    {
      id: "test",
      label: "Test Klaviyo",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Klaviyo"),
    },
    {
      id: "add_contact",
      label: "Add customer to Klaviyo",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Klaviyo"),
    },
    {
      id: "send_sale",
      label: "Send sale to Klaviyo",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Klaviyo"),
    },
  ],
};
