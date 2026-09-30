// printify -- Print-on-demand products from Printify's print partners.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Open REST API with a personal access token.

import { notBuilt } from './_scaffold.js';

export default {
  id: "printify",
  name: "Printify",
  category: "fulfilment",
  status: 'planned',
  description: "Print-on-demand products from Printify's print partners.",
  docsUrl: "https://developers.printify.com/",
  secrets: [
    {
      "name": "PRINTIFY_TOKEN",
      "label": "Printify personal access token"
    },
    {
      "name": "PRINTIFY_SHOP_ID",
      "label": "Printify shop ID"
    }
  ],
  actions: [
    {
      id: "confirm_order",
      label: "Send order to Printify",
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
      run: notBuilt("Printify"),
    },
    {
      id: "track",
      label: "Track Printify order",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Printify"),
    },
  ],
};
