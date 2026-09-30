// expedia -- See Expedia and Hotels.com reservations for your property.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Expedia Group lodging connectivity (partner access).

import { notBuilt } from './_scaffold.js';

export default {
  id: "expedia",
  name: "Expedia Group",
  category: "hospitality",
  status: 'planned',
  description: "See Expedia and Hotels.com reservations for your property.",
  docsUrl: "https://developers.expediagroup.com/supply/lodging",
  secrets: [
    {
      "name": "EXPEDIA_USERNAME",
      "label": "EQC username"
    },
    {
      "name": "EXPEDIA_PASSWORD",
      "label": "EQC password"
    },
    {
      "name": "EXPEDIA_HOTEL_ID",
      "label": "Hotel ID"
    }
  ],
  actions: [
    {
      id: "reservations",
      label: "Expedia reservations",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Expedia Group"),
    },
  ],
};
