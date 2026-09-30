// ebay -- List products on eBay and bring orders in.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: eBay Sell APIs (OAuth).

import { notBuilt } from './_scaffold.js';

export default {
  id: "ebay",
  name: "eBay",
  category: "commerce",
  status: 'planned',
  description: "List products on eBay and bring orders in.",
  docsUrl: "https://developer.ebay.com/",
  secrets: [
    {
      "name": "EBAY_CLIENT_ID",
      "label": "eBay app ID"
    },
    {
      "name": "EBAY_CLIENT_SECRET",
      "label": "eBay cert ID"
    },
    {
      "name": "EBAY_REFRESH_TOKEN",
      "label": "User refresh token"
    }
  ],
  actions: [
    {
      id: "sync_listings",
      label: "Sync inventory to eBay",
      placement: ["settings"],
      fields: [],
      run: notBuilt("eBay"),
    },
    {
      id: "orders",
      label: "eBay orders",
      placement: ["settings"],
      fields: [],
      run: notBuilt("eBay"),
    },
  ],
};
