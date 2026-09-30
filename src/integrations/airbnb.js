// airbnb -- See Airbnb bookings for your listings.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Airbnb API is for approved software partners only.

import { notBuilt } from './_scaffold.js';

export default {
  id: "airbnb",
  name: "Airbnb",
  category: "hospitality",
  status: 'planned',
  description: "See Airbnb bookings for your listings.",
  docsUrl: "https://www.airbnb.com/partner",
  secrets: [
    {
      "name": "AIRBNB_ACCESS_TOKEN",
      "label": "Airbnb API access token"
    }
  ],
  actions: [
    {
      id: "reservations",
      label: "Airbnb bookings",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Airbnb"),
    },
  ],
};
