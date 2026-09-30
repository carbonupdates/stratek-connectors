// amazon_scs -- Amazon's logistics network for any business: freight, storage and distribution.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Opened to all businesses in May 2026 (Amazon Supply Chain Services); API access details to confirm when building.

import { notBuilt } from './_scaffold.js';

export default {
  id: "amazon_scs",
  name: "Amazon Supply Chain Services",
  category: "fulfilment",
  status: 'planned',
  description: "Amazon's logistics network for any business: freight, storage and distribution.",
  docsUrl: "https://supplychain.amazon.com/",
  secrets: [
    {
      "name": "AMAZON_SCS_CLIENT_ID",
      "label": "Amazon Supply Chain client ID"
    },
    {
      "name": "AMAZON_SCS_CLIENT_SECRET",
      "label": "Amazon Supply Chain client secret"
    },
    {
      "name": "AMAZON_SCS_ACCOUNT_ID",
      "label": "Account ID"
    }
  ],
  actions: [
    {
      id: "create_shipment",
      outbound: true,
      label: "Ship with Amazon Supply Chain",
      placement: ["transaction"],
      fields: [
        {
          "name": "recipientName",
          "label": "Recipient name",
          "type": "text",
          "required": true
        },
        {
          "name": "recipientPhone",
          "label": "Recipient phone",
          "type": "tel",
          "required": true
        },
        {
          "name": "recipientAddress",
          "label": "Delivery address",
          "type": "text",
          "required": true
        },
        {
          "name": "weight",
          "label": "Weight (kg)",
          "type": "number"
        }
      ],
      run: notBuilt("Amazon Supply Chain Services"),
    },
    {
      id: "track",
      label: "Track Amazon Supply Chain shipment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Amazon Supply Chain Services"),
    },
  ],
};
