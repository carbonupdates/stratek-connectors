// hostaway -- Holiday rentals: reservations and extra charges in Hostaway.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Public API; account ID + API key (client credentials). Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "hostaway",
  name: "Hostaway",
  category: "hospitality",
  status: 'planned',
  description: "Holiday rentals: reservations and extra charges in Hostaway.",
  docsUrl: "https://api.hostaway.com/documentation",
  secrets: [
    { name: "HOSTAWAY_ACCOUNT_ID", label: "Account ID" },
    { name: "HOSTAWAY_API_KEY", label: "API key" },
  ],
  actions: [
    {
      id: "post_to_room", outbound: true,
      label: "Charge to booking (Hostaway)",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Hostaway"),
    },
    {
      id: "in_house",
      label: "Guests in house (Hostaway)",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Hostaway"),
    },
  ],
};
