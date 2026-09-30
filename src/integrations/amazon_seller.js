// amazon_seller -- Sell on Amazon: sync your inventory as listings and bring Amazon orders in.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Selling Partner API (Listings, Orders).

import { notBuilt } from './_scaffold.js';

export default {
  id: "amazon_seller",
  name: "Amazon Seller",
  category: "commerce",
  status: 'planned',
  description: "Sell on Amazon: sync your inventory as listings and bring Amazon orders in.",
  docsUrl: "https://developer-docs.amazon.com/sp-api/",
  secrets: [
    {
      "name": "AMAZON_SELLER_LWA_CLIENT_ID",
      "label": "Login with Amazon client ID"
    },
    {
      "name": "AMAZON_SELLER_LWA_CLIENT_SECRET",
      "label": "Client secret"
    },
    {
      "name": "AMAZON_SELLER_REFRESH_TOKEN",
      "label": "Refresh token"
    },
    {
      "name": "AMAZON_SELLER_MARKETPLACE_ID",
      "label": "Marketplace ID"
    }
  ],
  actions: [
    {
      id: "sync_listings",
      label: "Sync inventory to Amazon",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Amazon Seller"),
    },
    {
      id: "orders",
      label: "Amazon orders",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Amazon Seller"),
    },
  ],
};
