// guesty -- Rental operators: reservations and charges in Guesty.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Open API; client ID + secret (client credentials). Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "guesty",
  name: "Guesty",
  category: "hospitality",
  status: 'planned',
  description: "Rental operators: reservations and charges in Guesty.",
  docsUrl: "https://open-api-docs.guesty.com/",
  secrets: [
    { name: "GUESTY_CLIENT_ID", label: "Client ID" },
    { name: "GUESTY_CLIENT_SECRET", label: "Client secret" },
  ],
  actions: [
    {
      id: "post_to_room", outbound: true,
      label: "Charge to booking (Guesty)",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Guesty"),
    },
    {
      id: "in_house",
      label: "Guests in house (Guesty)",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Guesty"),
    },
  ],
};
