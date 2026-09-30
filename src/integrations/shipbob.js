// shipbob -- Store and fulfil orders with ShipBob warehouses (US, EU, Australia).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Open REST API (personal access token or OAuth).

import { notBuilt } from './_scaffold.js';

export default {
  id: "shipbob",
  name: "ShipBob",
  category: "fulfilment",
  status: 'planned',
  description: "Store and fulfil orders with ShipBob warehouses (US, EU, Australia).",
  docsUrl: "https://developer.shipbob.com/",
  secrets: [
    {
      "name": "SHIPBOB_TOKEN",
      "label": "ShipBob personal access token"
    }
  ],
  actions: [
    {
      id: "create_order",
      outbound: true,
      label: "Fulfil with ShipBob",
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
      run: notBuilt("ShipBob"),
    },
    {
      id: "track",
      label: "Track ShipBob order",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("ShipBob"),
    },
  ],
};
