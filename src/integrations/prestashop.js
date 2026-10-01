// prestashop -- Keep a PrestaShop store in step with Stratek, and see the latest orders.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Webservice; store URL + key. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "prestashop",
  name: "PrestaShop",
  category: "commerce",
  status: 'planned',
  description: "Keep a PrestaShop store in step with Stratek, and see the latest orders.",
  docsUrl: "https://devdocs.prestashop-project.org/8/webservice/",
  secrets: [
    { name: "PRESTASHOP_URL", label: "Store URL (https)" },
    { name: "PRESTASHOP_KEY", label: "Webservice key" },
  ],
  actions: [
    {
      id: "test",
      label: "Test PrestaShop",
      placement: ["settings"],
      fields: [],
      run: notBuilt("PrestaShop"),
    },
    {
      id: "sync_menu",
      label: "Sync inventory to PrestaShop",
      placement: ["settings"],
      fields: [],
      run: notBuilt("PrestaShop"),
    },
    {
      id: "orders",
      label: "Latest PrestaShop orders",
      placement: ["settings"],
      fields: [],
      run: notBuilt("PrestaShop"),
    },
  ],
};
