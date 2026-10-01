// smoobu -- Holiday rentals: reservations and extras in Smoobu.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: API v1; API key. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "smoobu",
  name: "Smoobu",
  category: "hospitality",
  status: 'planned',
  description: "Holiday rentals: reservations and extras in Smoobu.",
  docsUrl: "https://docs.smoobu.com/",
  secrets: [
    { name: "SMOOBU_API_KEY", label: "API key" },
  ],
  actions: [
    {
      id: "post_to_room", outbound: true,
      label: "Charge to booking (Smoobu)",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Smoobu"),
    },
    {
      id: "in_house",
      label: "Guests in house (Smoobu)",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Smoobu"),
    },
  ],
};
