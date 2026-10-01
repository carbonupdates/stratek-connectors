// opencart -- Keep an OpenCart store in step with Stratek, and see the latest orders.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: API user; store URL + API key. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "opencart",
  name: "OpenCart",
  category: "commerce",
  status: 'planned',
  description: "Keep an OpenCart store in step with Stratek, and see the latest orders.",
  docsUrl: "https://docs.opencart.com/",
  secrets: [
    { name: "OPENCART_URL", label: "Store URL (https)" },
    { name: "OPENCART_API_USER", label: "API username" },
    { name: "OPENCART_API_KEY", label: "API key" },
  ],
  actions: [
    {
      id: "test",
      label: "Test OpenCart",
      placement: ["settings"],
      fields: [],
      run: notBuilt("OpenCart"),
    },
    {
      id: "sync_menu",
      label: "Sync inventory to OpenCart",
      placement: ["settings"],
      fields: [],
      run: notBuilt("OpenCart"),
    },
    {
      id: "orders",
      label: "Latest OpenCart orders",
      placement: ["settings"],
      fields: [],
      run: notBuilt("OpenCart"),
    },
  ],
};
