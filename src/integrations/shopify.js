// shopify -- Keep a Shopify store in step with the POS menu and sales.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "shopify",
  name: "Shopify",
  category: "commerce",
  status: 'planned',
  description: "Keep a Shopify store in step with the POS menu and sales.",
  docsUrl: "https://shopify.dev/docs/api/admin-rest",
  secrets: [
    {
      name: "SHOPIFY_STORE_DOMAIN",
      label: "Store domain",
      hint: "e.g. yourshop.myshopify.com"
    },
    {
      name: "SHOPIFY_ADMIN_TOKEN",
      label: "Admin API access token"
    }
  ],
  actions: [
    {
      id: "sync_menu",
      label: "Sync menu to Shopify",
      placement: [
        "settings"
      ],
      fields: [],
      run: notBuilt("Shopify"),
    },
    {
      id: "record_sale",
      label: "Record sale in Shopify",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("Shopify"),
    },
  ],
};
