// pipedream -- Send sales to Pipedream workflows.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: HTTP trigger URL. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "pipedream",
  name: "Pipedream",
  category: "automation",
  status: 'planned',
  description: "Send sales to Pipedream workflows.",
  docsUrl: "https://pipedream.com/docs/workflows/building-workflows/triggers/",
  secrets: [
    { name: "PIPEDREAM_URL", label: "Pipedream trigger URL" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Pipedream",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Pipedream"),
    },
    {
      id: "send",
      label: "Send sale to Pipedream",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Pipedream"),
    },
  ],
};
