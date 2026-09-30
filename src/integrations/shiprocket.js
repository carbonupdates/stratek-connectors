// shiprocket -- Ship orders across India with Shiprocket (for INR shops).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Open REST API (token from an API user).

import { notBuilt } from './_scaffold.js';

export default {
  id: "shiprocket",
  name: "Shiprocket",
  category: "delivery",
  status: 'planned',
  description: "Ship orders across India with Shiprocket (for INR shops).",
  docsUrl: "https://apidocs.shiprocket.in/",
  secrets: [
    {
      "name": "SHIPROCKET_EMAIL",
      "label": "Shiprocket API user email"
    },
    {
      "name": "SHIPROCKET_PASSWORD",
      "label": "Shiprocket API user password"
    }
  ],
  actions: [
    {
      id: "create_shipment",
      outbound: true,
      label: "Ship with Shiprocket",
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
      run: notBuilt("Shiprocket"),
    },
    {
      id: "track",
      label: "Track Shiprocket shipment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Shiprocket"),
    },
  ],
};
