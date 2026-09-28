// woocommerce -- Keep a WooCommerce store in step with the POS menu and sales.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "woocommerce",
  name: "WooCommerce",
  category: "commerce",
  status: 'planned',
  description: "Keep a WooCommerce store in step with the POS menu and sales.",
  docsUrl: "https://woocommerce.github.io/woocommerce-rest-api-docs/",
  secrets: [
    {
      name: "WOO_STORE_URL",
      label: "Store address",
      hint: "https://yourshop.com"
    },
    {
      name: "WOO_CONSUMER_KEY",
      label: "Consumer key"
    },
    {
      name: "WOO_CONSUMER_SECRET",
      label: "Consumer secret"
    }
  ],
  actions: [
    {
      id: "sync_menu",
      label: "Sync menu to WooCommerce",
      placement: [
        "settings"
      ],
      fields: [],
      run: notBuilt("WooCommerce"),
    },
    {
      id: "record_sale",
      label: "Record sale in WooCommerce",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("WooCommerce"),
    },
  ],
};
