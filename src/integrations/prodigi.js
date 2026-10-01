// prodigi -- Print-on-demand art prints, canvas and photo products through Prodigi.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Print API v4; API key (sandbox self-serve). Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "prodigi",
  name: "Prodigi",
  category: "fulfilment",
  status: 'planned',
  description: "Print-on-demand art prints, canvas and photo products through Prodigi.",
  docsUrl: "https://www.prodigi.com/print-api/docs/",
  secrets: [
    { name: "PRODIGI_API_KEY", label: "API key" },
  ],
  actions: [
    {
      id: "quote",
      label: "Price Prodigi order",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Prodigi"),
    },
    {
      id: "confirm_order",
      label: "Confirm Prodigi order",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Prodigi"),
    },
    {
      id: "track",
      label: "Track Prodigi order",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Prodigi"),
    },
  ],
};
