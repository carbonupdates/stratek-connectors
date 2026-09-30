// cj_dropshipping -- Source products from China and let CJ ship them to your customers.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Open API (API key -> access token).

import { notBuilt } from './_scaffold.js';

export default {
  id: "cj_dropshipping",
  name: "CJdropshipping",
  category: "sourcing",
  status: 'planned',
  description: "Source products from China and let CJ ship them to your customers.",
  docsUrl: "https://developers.cjdropshipping.com/",
  secrets: [
    {
      "name": "CJ_API_KEY",
      "label": "CJ API key"
    }
  ],
  actions: [
    {
      id: "import_product",
      label: "Import CJ product",
      placement: ["settings"],
      fields: [
        {
          "name": "productUrl",
          "label": "CJ product link or SKU",
          "type": "text",
          "required": true
        }
      ],
      run: notBuilt("CJdropshipping"),
    },
    {
      id: "confirm_order",
      label: "Order from CJ",
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
      run: notBuilt("CJdropshipping"),
    },
    {
      id: "track",
      label: "Track CJ order",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("CJdropshipping"),
    },
  ],
};
