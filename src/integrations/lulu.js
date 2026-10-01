// lulu -- Print and ship books and booklets on demand through Lulu.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Print Jobs API; client key + secret (sandbox self-serve). Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "lulu",
  name: "Lulu Print API",
  category: "fulfilment",
  status: 'planned',
  description: "Print and ship books and booklets on demand through Lulu.",
  docsUrl: "https://api.lulu.com/docs/",
  secrets: [
    { name: "LULU_CLIENT_KEY", label: "Client key" },
    { name: "LULU_CLIENT_SECRET", label: "Client secret" },
  ],
  actions: [
    {
      id: "quote",
      label: "Price Lulu Print API order",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Lulu Print API"),
    },
    {
      id: "confirm_order",
      label: "Confirm Lulu Print API order",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Lulu Print API"),
    },
    {
      id: "track",
      label: "Track Lulu Print API order",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Lulu Print API"),
    },
  ],
};
