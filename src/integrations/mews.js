// mews -- Hotel PMS: post sales to a guest's bill and see guests in house.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Mews Connector API (open; certification before production).

import { notBuilt } from './_scaffold.js';

export default {
  id: "mews",
  name: "Mews",
  category: "hospitality",
  status: 'planned',
  description: "Hotel PMS: post sales to a guest's bill and see guests in house.",
  docsUrl: "https://mews-systems.gitbook.io/connector-api/",
  secrets: [
    {
      "name": "MEWS_CLIENT_TOKEN",
      "label": "Mews client token"
    },
    {
      "name": "MEWS_ACCESS_TOKEN",
      "label": "Mews access token"
    },
    {
      "name": "MEWS_SERVICE_ID",
      "label": "Service ID (your outlet)"
    }
  ],
  actions: [
    {
      id: "post_to_room",
      label: "Charge to room (Mews)",
      placement: ["transaction"],
      fields: [
        {
          "name": "roomOrGuest",
          "label": "Room number or guest name",
          "type": "text",
          "required": true
        }
      ],
      run: notBuilt("Mews"),
    },
    {
      id: "in_house",
      label: "Guests in house (Mews)",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Mews"),
    },
  ],
};
