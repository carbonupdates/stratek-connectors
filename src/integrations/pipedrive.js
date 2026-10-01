// pipedrive -- Add customers and deals to Pipedrive.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: API; API token. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "pipedrive",
  name: "Pipedrive",
  category: "marketing",
  status: 'planned',
  description: "Add customers and deals to Pipedrive.",
  docsUrl: "https://developers.pipedrive.com/docs/api/v1",
  secrets: [
    { name: "PIPEDRIVE_TOKEN", label: "API token" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Pipedrive",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Pipedrive"),
    },
    {
      id: "add_contact",
      label: "Add customer to Pipedrive",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Pipedrive"),
    },
  ],
};
