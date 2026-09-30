// foodmandu -- Receive Foodmandu food-delivery orders (Nepal).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: No public API -- partner access to confirm with Foodmandu.

import { notBuilt } from './_scaffold.js';

export default {
  id: "foodmandu",
  name: "Foodmandu",
  category: "hospitality",
  status: 'planned',
  description: "Receive Foodmandu food-delivery orders (Nepal).",
  docsUrl: "https://foodmandu.com/",
  secrets: [
    {
      "name": "FOODMANDU_API_KEY",
      "label": "Foodmandu partner key"
    }
  ],
  actions: [
    {
      id: "orders",
      label: "Foodmandu orders",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Foodmandu"),
    },
  ],
};
