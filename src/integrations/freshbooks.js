// freshbooks -- Send sales to FreshBooks as invoices.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Accounting API; your own app + Connect (OAuth), like Xero. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "freshbooks",
  name: "FreshBooks",
  category: "accounting",
  status: 'planned',
  description: "Send sales to FreshBooks as invoices.",
  docsUrl: "https://www.freshbooks.com/api/start",
  secrets: [
    { name: "FRESHBOOKS_CLIENT_ID", label: "App client ID" },
    { name: "FRESHBOOKS_CLIENT_SECRET", label: "App client secret" },
  ],
  actions: [
    {
      id: "test",
      label: "Test FreshBooks",
      placement: ["settings"],
      fields: [],
      run: notBuilt("FreshBooks"),
    },
    {
      id: "send_sale",
      label: "Send sale to FreshBooks",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("FreshBooks"),
    },
  ],
};
