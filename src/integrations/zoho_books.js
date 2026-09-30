// zoho_books -- Send sales to Zoho Books as invoices.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Zoho Books API v3 (OAuth).

import { notBuilt } from './_scaffold.js';

export default {
  id: "zoho_books",
  name: "Zoho Books",
  category: "accounting",
  status: 'planned',
  description: "Send sales to Zoho Books as invoices.",
  docsUrl: "https://www.zoho.com/books/api/v3/",
  secrets: [
    {
      "name": "ZOHO_CLIENT_ID",
      "label": "Zoho client ID"
    },
    {
      "name": "ZOHO_CLIENT_SECRET",
      "label": "Zoho client secret"
    },
    {
      "name": "ZOHO_REFRESH_TOKEN",
      "label": "Refresh token"
    },
    {
      "name": "ZOHO_ORG_ID",
      "label": "Organization ID"
    }
  ],
  actions: [
    {
      id: "send_invoice",
      label: "Send sale to Zoho Books",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Zoho Books"),
    },
  ],
};
