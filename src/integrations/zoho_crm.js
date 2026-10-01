// zoho_crm -- Add customers to Zoho CRM.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: API; your own Zoho client + Connect (OAuth), like Zoho Books. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "zoho_crm",
  name: "Zoho CRM",
  category: "marketing",
  status: 'planned',
  description: "Add customers to Zoho CRM.",
  docsUrl: "https://www.zoho.com/crm/developer/docs/api/v7/",
  secrets: [
    { name: "ZOHO_CRM_CLIENT_ID", label: "Client ID" },
    { name: "ZOHO_CRM_CLIENT_SECRET", label: "Client secret" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Zoho CRM",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Zoho CRM"),
    },
    {
      id: "add_contact",
      label: "Add customer to Zoho CRM",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Zoho CRM"),
    },
  ],
};
