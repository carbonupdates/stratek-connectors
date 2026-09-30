// amazon_mcf -- Fulfil orders from your Amazon (FBA) inventory with Multi-Channel Fulfillment.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Selling Partner API, Fulfillment Outbound v2020-07-01 (getFulfillmentPreview, createFulfillmentOrder, getPackageTrackingDetails). Needs an Amazon seller account with FBA inventory.

import { notBuilt } from './_scaffold.js';

export default {
  id: "amazon_mcf",
  name: "Amazon Multi-Channel Fulfillment",
  category: "fulfilment",
  status: 'planned',
  description: "Fulfil orders from your Amazon (FBA) inventory with Multi-Channel Fulfillment.",
  docsUrl: "https://developer-docs.amazon.com/sp-api/docs/fulfillment-outbound-api",
  secrets: [
    {
      "name": "AMAZON_LWA_CLIENT_ID",
      "label": "Login with Amazon client ID"
    },
    {
      "name": "AMAZON_LWA_CLIENT_SECRET",
      "label": "Login with Amazon client secret"
    },
    {
      "name": "AMAZON_REFRESH_TOKEN",
      "label": "Selling Partner refresh token"
    },
    {
      "name": "AMAZON_MARKETPLACE_ID",
      "label": "Marketplace ID"
    },
    {
      "name": "AMAZON_REGION",
      "label": "SP-API region (na, eu, fe)",
      "optional": true
    }
  ],
  actions: [
    {
      id: "preview",
      label: "Preview Amazon fulfillment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Amazon Multi-Channel Fulfillment"),
    },
    {
      id: "create_fulfillment",
      outbound: true,
      label: "Fulfil with Amazon (MCF)",
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
      run: notBuilt("Amazon Multi-Channel Fulfillment"),
    },
    {
      id: "track",
      label: "Track Amazon fulfillment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Amazon Multi-Channel Fulfillment"),
    },
  ],
};
