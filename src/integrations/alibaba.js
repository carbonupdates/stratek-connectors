// alibaba -- Find suppliers and products on Alibaba.com and track your sourcing orders.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Alibaba.com Open Platform (app approval required).

import { notBuilt } from './_scaffold.js';

export default {
  id: "alibaba",
  name: "Alibaba.com",
  category: "sourcing",
  status: 'planned',
  description: "Find suppliers and products on Alibaba.com and track your sourcing orders.",
  docsUrl: "https://openapi.alibaba.com/",
  secrets: [
    {
      "name": "ALIBABA_APP_KEY",
      "label": "Alibaba Open Platform app key"
    },
    {
      "name": "ALIBABA_APP_SECRET",
      "label": "App secret"
    },
    {
      "name": "ALIBABA_ACCESS_TOKEN",
      "label": "Access token"
    }
  ],
  actions: [
    {
      id: "search_products",
      label: "Search Alibaba suppliers",
      placement: ["settings"],
      fields: [
        {
          "name": "query",
          "label": "What are you looking for?",
          "type": "text",
          "required": true
        }
      ],
      run: notBuilt("Alibaba.com"),
    },
    {
      id: "track",
      label: "Track Alibaba order",
      placement: ["settings"],
      fields: [
        {
          "name": "orderId",
          "label": "Order number",
          "type": "text",
          "required": true
        }
      ],
      run: notBuilt("Alibaba.com"),
    },
  ],
};
