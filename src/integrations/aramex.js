// aramex -- International courier with Aramex: rates, shipments and tracking.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Aramex Shipping / Rate / Tracking web services; credentials from your Aramex account manager.

import { notBuilt } from './_scaffold.js';

export default {
  id: "aramex",
  name: "Aramex",
  category: "delivery",
  status: 'planned',
  description: "International courier with Aramex: rates, shipments and tracking.",
  docsUrl: "https://www.aramex.com/us/en/developers-solution-center",
  secrets: [
    {
      "name": "ARAMEX_USERNAME",
      "label": "Aramex API username"
    },
    {
      "name": "ARAMEX_PASSWORD",
      "label": "Aramex API password"
    },
    {
      "name": "ARAMEX_ACCOUNT_NUMBER",
      "label": "Aramex account number"
    },
    {
      "name": "ARAMEX_ACCOUNT_PIN",
      "label": "Account PIN"
    },
    {
      "name": "ARAMEX_ENTITY",
      "label": "Account entity (e.g. KTM)"
    },
    {
      "name": "ARAMEX_COUNTRY",
      "label": "Account country code (e.g. NP)"
    }
  ],
  actions: [
    {
      id: "quote",
      label: "Get Aramex rate",
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
      run: notBuilt("Aramex"),
    },
    {
      id: "create_shipment",
      outbound: true,
      label: "Ship with Aramex",
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
      run: notBuilt("Aramex"),
    },
    {
      id: "track",
      label: "Track Aramex shipment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Aramex"),
    },
  ],
};
