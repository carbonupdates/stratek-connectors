// cloudbeds -- Hotel PMS: charge a restaurant, bar or shop sale to a guest's room, and see arrivals.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Open REST API (API key / OAuth).

import { notBuilt } from './_scaffold.js';

export default {
  id: "cloudbeds",
  name: "Cloudbeds",
  category: "hospitality",
  status: 'planned',
  description: "Hotel PMS: charge a restaurant, bar or shop sale to a guest's room, and see arrivals.",
  docsUrl: "https://www.cloudbeds.com/api/",
  secrets: [
    {
      "name": "CLOUDBEDS_API_KEY",
      "label": "Cloudbeds API key"
    },
    {
      "name": "CLOUDBEDS_PROPERTY_ID",
      "label": "Property ID"
    }
  ],
  actions: [
    {
      id: "post_to_room",
      label: "Charge to room (Cloudbeds)",
      placement: ["transaction"],
      fields: [
        {
          "name": "roomOrGuest",
          "label": "Room number or guest name",
          "type": "text",
          "required": true
        }
      ],
      run: notBuilt("Cloudbeds"),
    },
    {
      id: "arrivals",
      label: "Today's arrivals (Cloudbeds)",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Cloudbeds"),
    },
  ],
};
