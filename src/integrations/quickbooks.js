// quickbooks -- Send sales to QuickBooks as sales receipts.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "quickbooks",
  name: "QuickBooks Online",
  category: "accounting",
  status: 'planned',
  description: "Send sales to QuickBooks as sales receipts.",
  docsUrl: "https://developer.intuit.com/app/developer/qbo/docs/get-started",
  secrets: [
    {
      name: "QUICKBOOKS_CLIENT_ID",
      label: "Client ID"
    },
    {
      name: "QUICKBOOKS_CLIENT_SECRET",
      label: "Client secret"
    },
    {
      name: "QUICKBOOKS_REFRESH_TOKEN",
      label: "Refresh token"
    },
    {
      name: "QUICKBOOKS_REALM_ID",
      label: "Company (realm) ID"
    }
  ],
  actions: [
    {
      id: "send_sale",
      label: "Send sale to QuickBooks",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("QuickBooks Online"),
    },
  ],
};
