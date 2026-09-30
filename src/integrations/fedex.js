// fedex -- International and domestic shipping with FedEx: rates, labels and tracking.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Open API (FedEx Developer Portal): OAuth client credentials; Rate, Ship and Track APIs.

import { notBuilt } from './_scaffold.js';

export default {
  id: "fedex",
  name: "FedEx",
  category: "delivery",
  status: 'planned',
  description: "International and domestic shipping with FedEx: rates, labels and tracking.",
  docsUrl: "https://developer.fedex.com/api/en-us/home.html",
  secrets: [
    {
      "name": "FEDEX_CLIENT_ID",
      "label": "FedEx API key (client ID)",
      "hint": "developer.fedex.com -> My projects -> your project."
    },
    {
      "name": "FEDEX_CLIENT_SECRET",
      "label": "FedEx secret key"
    },
    {
      "name": "FEDEX_ACCOUNT_NUMBER",
      "label": "FedEx account number"
    }
  ],
  actions: [
    {
      id: "quote",
      label: "Get FedEx rate",
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
      run: notBuilt("FedEx"),
    },
    {
      id: "create_shipment",
      outbound: true,
      label: "Ship with FedEx",
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
      run: notBuilt("FedEx"),
    },
    {
      id: "track",
      label: "Track FedEx shipment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("FedEx"),
    },
  ],
};
