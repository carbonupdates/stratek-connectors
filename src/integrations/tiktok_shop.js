// tiktok_shop -- Sell through TikTok Shop: products and orders.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: TikTok Shop Partner Center (app approval).

import { notBuilt } from './_scaffold.js';

export default {
  id: "tiktok_shop",
  name: "TikTok Shop",
  category: "commerce",
  status: 'planned',
  description: "Sell through TikTok Shop: products and orders.",
  docsUrl: "https://partner.tiktokshop.com/docv2",
  secrets: [
    {
      "name": "TIKTOK_APP_KEY",
      "label": "App key"
    },
    {
      "name": "TIKTOK_APP_SECRET",
      "label": "App secret"
    },
    {
      "name": "TIKTOK_ACCESS_TOKEN",
      "label": "Access token"
    }
  ],
  actions: [
    {
      id: "sync_listings",
      label: "Sync inventory to TikTok Shop",
      placement: ["settings"],
      fields: [],
      run: notBuilt("TikTok Shop"),
    },
    {
      id: "orders",
      label: "TikTok Shop orders",
      placement: ["settings"],
      fields: [],
      run: notBuilt("TikTok Shop"),
    },
  ],
};
