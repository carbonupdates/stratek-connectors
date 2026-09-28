// dhl -- International shipping labels and tracking with DHL Express.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "dhl",
  name: "DHL Express",
  category: "delivery",
  status: 'planned',
  description: "International shipping labels and tracking with DHL Express.",
  docsUrl: "https://developer.dhl.com/",
  secrets: [
    {
      name: "DHL_API_KEY",
      label: "DHL API key"
    },
    {
      name: "DHL_API_SECRET",
      label: "DHL API secret"
    },
    {
      name: "DHL_ACCOUNT_NUMBER",
      label: "DHL account number"
    }
  ],
  actions: [
    {
      id: "create_shipment",
      label: "Ship with DHL",
      placement: [
        "transaction"
      ],
      fields: [
        {
          name: "recipientName",
          label: "Recipient name",
          type: "text",
          required: true
        },
        {
          name: "recipientPhone",
          label: "Recipient phone",
          type: "tel",
          required: true
        },
        {
          name: "recipientAddress",
          label: "Delivery address",
          type: "text",
          required: true
        }
      ],
      run: notBuilt("DHL Express"),
    },
    {
      id: "track",
      label: "Track DHL shipment",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("DHL Express"),
    },
  ],
};
