// gumroad -- Digital products: see Gumroad sales next to Stratek.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: API v2; access token. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "gumroad",
  name: "Gumroad",
  category: "commerce",
  status: 'planned',
  description: "Digital products: see Gumroad sales next to Stratek.",
  docsUrl: "https://gumroad.com/api",
  secrets: [
    { name: "GUMROAD_TOKEN", label: "Access token" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Gumroad",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Gumroad"),
    },
    {
      id: "orders",
      label: "Latest Gumroad sales",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Gumroad"),
    },
  ],
};
