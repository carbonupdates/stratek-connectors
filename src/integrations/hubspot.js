// hubspot -- Save customers and sales in HubSpot CRM.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "hubspot",
  name: "HubSpot",
  category: "marketing",
  status: 'planned',
  description: "Save customers and sales in HubSpot CRM.",
  docsUrl: "https://developers.hubspot.com/docs/api/overview",
  secrets: [
    {
      name: "HUBSPOT_TOKEN",
      label: "Private app access token"
    }
  ],
  actions: [
    {
      id: "add_customer",
      label: "Add customer to HubSpot",
      placement: [
        "transaction"
      ],
      fields: [
        {
          name: "email",
          label: "Customer email",
          type: "email",
          required: true
        },
        {
          name: "name",
          label: "Customer name",
          type: "text"
        }
      ],
      run: notBuilt("HubSpot"),
    },
  ],
};
