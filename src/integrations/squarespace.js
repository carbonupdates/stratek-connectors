// squarespace -- Keep Squarespace stock in step with Stratek, and see the latest orders.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Commerce APIs; API key. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "squarespace",
  name: "Squarespace Commerce",
  category: "commerce",
  status: 'planned',
  description: "Keep Squarespace stock in step with Stratek, and see the latest orders.",
  docsUrl: "https://developers.squarespace.com/commerce-apis/overview",
  secrets: [
    { name: "SQUARESPACE_API_KEY", label: "API key" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Squarespace Commerce",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Squarespace Commerce"),
    },
    {
      id: "sync_menu",
      label: "Sync inventory to Squarespace Commerce",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Squarespace Commerce"),
    },
    {
      id: "orders",
      label: "Latest Squarespace Commerce orders",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Squarespace Commerce"),
    },
  ],
};
