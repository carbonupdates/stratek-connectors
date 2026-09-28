// xero -- Send sales to Xero as invoices.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "xero",
  name: "Xero",
  category: "accounting",
  status: 'planned',
  description: "Send sales to Xero as invoices.",
  docsUrl: "https://developer.xero.com/documentation/",
  secrets: [
    {
      name: "XERO_CLIENT_ID",
      label: "Client ID"
    },
    {
      name: "XERO_CLIENT_SECRET",
      label: "Client secret"
    },
    {
      name: "XERO_REFRESH_TOKEN",
      label: "Refresh token"
    },
    {
      name: "XERO_TENANT_ID",
      label: "Tenant ID"
    }
  ],
  actions: [
    {
      id: "send_sale",
      label: "Send sale to Xero",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("Xero"),
    },
  ],
};
