// printful -- Print-on-demand apparel and merch, made and shipped by Printful.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Open REST API with a private token.

import { notBuilt } from './_scaffold.js';

export default {
  id: "printful",
  name: "Printful",
  category: "fulfilment",
  status: 'planned',
  description: "Print-on-demand apparel and merch, made and shipped by Printful.",
  docsUrl: "https://developers.printful.com/docs/",
  secrets: [
    {
      "name": "PRINTFUL_TOKEN",
      "label": "Printful private token"
    }
  ],
  actions: [
    {
      id: "confirm_order",
      label: "Send order to Printful",
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
      run: notBuilt("Printful"),
    },
    {
      id: "track",
      label: "Track Printful order",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Printful"),
    },
  ],
};
