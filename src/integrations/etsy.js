// etsy -- Sell handmade and craft products on Etsy: listings and orders.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Etsy Open API v3 (OAuth).

import { notBuilt } from './_scaffold.js';

export default {
  id: "etsy",
  name: "Etsy",
  category: "commerce",
  status: 'planned',
  description: "Sell handmade and craft products on Etsy: listings and orders.",
  docsUrl: "https://developers.etsy.com/",
  secrets: [
    {
      "name": "ETSY_API_KEY",
      "label": "Etsy API key (keystring)"
    },
    {
      "name": "ETSY_ACCESS_TOKEN",
      "label": "OAuth access token"
    },
    {
      "name": "ETSY_SHOP_ID",
      "label": "Shop ID"
    }
  ],
  actions: [
    {
      id: "sync_listings",
      label: "Sync inventory to Etsy",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Etsy"),
    },
    {
      id: "orders",
      label: "Etsy orders",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Etsy"),
    },
  ],
};
