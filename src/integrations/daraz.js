// daraz -- Daraz seller orders and stock (Nepal, South Asia).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "daraz",
  name: "Daraz",
  category: "commerce",
  status: 'planned',
  description: "Daraz seller orders and stock (Nepal, South Asia).",
  docsUrl: "https://open.daraz.com/",
  secrets: [
    {
      name: "DARAZ_APP_KEY",
      label: "App key"
    },
    {
      name: "DARAZ_APP_SECRET",
      label: "App secret"
    },
    {
      name: "DARAZ_ACCESS_TOKEN",
      label: "Access token"
    }
  ],
  actions: [
    {
      id: "sync_stock",
      label: "Sync stock to Daraz",
      placement: [
        "settings"
      ],
      fields: [],
      run: notBuilt("Daraz"),
    },
  ],
};
