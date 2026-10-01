// lodgify -- Holiday rentals: bookings and charges in Lodgify.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Public API v2; API key. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "lodgify",
  name: "Lodgify",
  category: "hospitality",
  status: 'planned',
  description: "Holiday rentals: bookings and charges in Lodgify.",
  docsUrl: "https://docs.lodgify.com/",
  secrets: [
    { name: "LODGIFY_API_KEY", label: "API key" },
  ],
  actions: [
    {
      id: "post_to_room", outbound: true,
      label: "Charge to booking (Lodgify)",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Lodgify"),
    },
    {
      id: "in_house",
      label: "Guests in house (Lodgify)",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Lodgify"),
    },
  ],
};
