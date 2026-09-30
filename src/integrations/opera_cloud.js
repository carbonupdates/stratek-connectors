// opera_cloud -- Post sales to guest folios in Oracle OPERA Cloud (hotels and resorts).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Oracle Hospitality Integration Platform (OHIP); partner / customer credentials.

import { notBuilt } from './_scaffold.js';

export default {
  id: "opera_cloud",
  name: "Oracle OPERA Cloud",
  category: "hospitality",
  status: 'planned',
  description: "Post sales to guest folios in Oracle OPERA Cloud (hotels and resorts).",
  docsUrl: "https://docs.oracle.com/en/industries/hospitality/integration-platform/",
  secrets: [
    {
      "name": "OHIP_CLIENT_ID",
      "label": "OHIP client ID"
    },
    {
      "name": "OHIP_CLIENT_SECRET",
      "label": "OHIP client secret"
    },
    {
      "name": "OHIP_APP_KEY",
      "label": "OHIP app key"
    },
    {
      "name": "OHIP_HOTEL_ID",
      "label": "Hotel ID"
    },
    {
      "name": "OHIP_GATEWAY_URL",
      "label": "OHIP gateway URL"
    }
  ],
  actions: [
    {
      id: "post_to_room",
      label: "Charge to room (OPERA)",
      placement: ["transaction"],
      fields: [
        {
          "name": "roomOrGuest",
          "label": "Room number or guest name",
          "type": "text",
          "required": true
        }
      ],
      run: notBuilt("Oracle OPERA Cloud"),
    },
  ],
};
