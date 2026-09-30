// aliexpress -- Import AliExpress products into your inventory and place dropshipping orders.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: AliExpress Open Platform dropshipping (DS) APIs (app approval required).

import { notBuilt } from './_scaffold.js';

export default {
  id: "aliexpress",
  name: "AliExpress dropshipping",
  category: "sourcing",
  status: 'planned',
  description: "Import AliExpress products into your inventory and place dropshipping orders.",
  docsUrl: "https://openservice.aliexpress.com/",
  secrets: [
    {
      "name": "ALIEXPRESS_APP_KEY",
      "label": "AliExpress app key"
    },
    {
      "name": "ALIEXPRESS_APP_SECRET",
      "label": "App secret"
    },
    {
      "name": "ALIEXPRESS_ACCESS_TOKEN",
      "label": "Access token"
    }
  ],
  actions: [
    {
      id: "import_product",
      label: "Import AliExpress product",
      placement: ["settings"],
      fields: [
        {
          "name": "productUrl",
          "label": "AliExpress product link",
          "type": "text",
          "required": true
        }
      ],
      run: notBuilt("AliExpress dropshipping"),
    },
    {
      id: "confirm_order",
      label: "Order from AliExpress",
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
      run: notBuilt("AliExpress dropshipping"),
    },
    {
      id: "track",
      label: "Track AliExpress order",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("AliExpress dropshipping"),
    },
  ],
};
