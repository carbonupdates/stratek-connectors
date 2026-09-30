// easyship -- Compare hundreds of couriers and print labels for international orders with Easyship.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Open REST API with a bearer token.

import { notBuilt } from './_scaffold.js';

export default {
  id: "easyship",
  name: "Easyship",
  category: "delivery",
  status: 'planned',
  description: "Compare hundreds of couriers and print labels for international orders with Easyship.",
  docsUrl: "https://developers.easyship.com/",
  secrets: [
    {
      "name": "EASYSHIP_TOKEN",
      "label": "Easyship API access token"
    }
  ],
  actions: [
    {
      id: "quote",
      label: "Get Easyship rate",
      placement: ["transaction"],
      fields: [
        {
          "name": "weight",
          "label": "Weight (kg)",
          "type": "number",
          "required": true
        },
        {
          "name": "country",
          "label": "Destination country code (e.g. US)",
          "type": "text",
          "required": true
        }
      ],
      run: notBuilt("Easyship"),
    },
    {
      id: "create_shipment",
      outbound: true,
      label: "Ship with Easyship",
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
      run: notBuilt("Easyship"),
    },
    {
      id: "track",
      label: "Track Easyship shipment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Easyship"),
    },
  ],
};
