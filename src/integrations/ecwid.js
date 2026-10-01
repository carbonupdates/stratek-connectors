// ecwid -- Keep an Ecwid store in step with Stratek, and see the latest orders.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: REST API; store ID + secret token (custom app). Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "ecwid",
  name: "Ecwid by Lightspeed",
  category: "commerce",
  status: 'planned',
  description: "Keep an Ecwid store in step with Stratek, and see the latest orders.",
  docsUrl: "https://api-docs.ecwid.com/",
  secrets: [
    { name: "ECWID_STORE_ID", label: "Store ID" },
    { name: "ECWID_TOKEN", label: "Secret token" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Ecwid by Lightspeed",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Ecwid by Lightspeed"),
    },
    {
      id: "sync_menu",
      label: "Sync inventory to Ecwid by Lightspeed",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Ecwid by Lightspeed"),
    },
    {
      id: "orders",
      label: "Latest Ecwid by Lightspeed orders",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Ecwid by Lightspeed"),
    },
  ],
};
