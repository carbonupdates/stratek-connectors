// magento -- Keep a Magento store in step with Stratek, and see the latest orders.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: REST API; store URL + integration access token. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "magento",
  name: "Magento / Adobe Commerce",
  category: "commerce",
  status: 'planned',
  description: "Keep a Magento store in step with Stratek, and see the latest orders.",
  docsUrl: "https://developer.adobe.com/commerce/webapi/rest/",
  secrets: [
    { name: "MAGENTO_URL", label: "Store URL (https)" },
    { name: "MAGENTO_TOKEN", label: "Integration access token" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Magento / Adobe Commerce",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Magento / Adobe Commerce"),
    },
    {
      id: "sync_menu",
      label: "Sync inventory to Magento / Adobe Commerce",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Magento / Adobe Commerce"),
    },
    {
      id: "orders",
      label: "Latest Magento / Adobe Commerce orders",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Magento / Adobe Commerce"),
    },
  ],
};
