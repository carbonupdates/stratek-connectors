// opentable -- Restaurant table reservations from OpenTable.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: OpenTable partner API (approval required).

import { notBuilt } from './_scaffold.js';

export default {
  id: "opentable",
  name: "OpenTable",
  category: "hospitality",
  status: 'planned',
  description: "Restaurant table reservations from OpenTable.",
  docsUrl: "https://platform.opentable.com/",
  secrets: [
    {
      "name": "OPENTABLE_CLIENT_ID",
      "label": "OpenTable client ID"
    },
    {
      "name": "OPENTABLE_CLIENT_SECRET",
      "label": "OpenTable client secret"
    },
    {
      "name": "OPENTABLE_RID",
      "label": "Restaurant ID"
    }
  ],
  actions: [
    {
      id: "reservations",
      label: "Today's bookings (OpenTable)",
      placement: ["settings"],
      fields: [],
      run: notBuilt("OpenTable"),
    },
  ],
};
