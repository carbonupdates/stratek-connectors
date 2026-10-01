// bigbuy -- European dropship wholesaler: catalogue, orders and tracking through BigBuy.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: REST API; API key (with a BigBuy plan; sandbox available). Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "bigbuy",
  name: "BigBuy",
  category: "sourcing",
  status: 'planned',
  description: "European dropship wholesaler: catalogue, orders and tracking through BigBuy.",
  docsUrl: "https://api.bigbuy.eu/rest/doc",
  secrets: [
    { name: "BIGBUY_API_KEY", label: "API key" },
  ],
  actions: [
    {
      id: "quote",
      label: "Price BigBuy order",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("BigBuy"),
    },
    {
      id: "confirm_order",
      label: "Confirm BigBuy order",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("BigBuy"),
    },
    {
      id: "track",
      label: "Track BigBuy order",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("BigBuy"),
    },
  ],
};
