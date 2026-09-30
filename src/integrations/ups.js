// ups -- Ship with UPS: rates, labels and tracking.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Open API (UPS Developer Portal): OAuth; Rating, Shipping and Tracking APIs.

import { notBuilt } from './_scaffold.js';

export default {
  id: "ups",
  name: "UPS",
  category: "delivery",
  status: 'planned',
  description: "Ship with UPS: rates, labels and tracking.",
  docsUrl: "https://developer.ups.com/",
  secrets: [
    {
      "name": "UPS_CLIENT_ID",
      "label": "UPS client ID"
    },
    {
      "name": "UPS_CLIENT_SECRET",
      "label": "UPS client secret"
    },
    {
      "name": "UPS_ACCOUNT_NUMBER",
      "label": "UPS account (shipper) number"
    }
  ],
  actions: [
    {
      id: "quote",
      label: "Get UPS rate",
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
      run: notBuilt("UPS"),
    },
    {
      id: "create_shipment",
      outbound: true,
      label: "Ship with UPS",
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
      run: notBuilt("UPS"),
    },
    {
      id: "track",
      label: "Track UPS shipment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("UPS"),
    },
  ],
};
