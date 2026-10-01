// power_automate -- Send sales to Power Automate flows (Microsoft 365).
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: "When an HTTP request is received" trigger URL. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "power_automate",
  name: "Microsoft Power Automate",
  category: "automation",
  status: 'planned',
  description: "Send sales to Power Automate flows (Microsoft 365).",
  docsUrl: "https://learn.microsoft.com/en-us/power-automate/",
  secrets: [
    { name: "POWER_AUTOMATE_URL", label: "Flow HTTP trigger URL" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Microsoft Power Automate",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Microsoft Power Automate"),
    },
    {
      id: "send",
      label: "Send sale to Microsoft Power Automate",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Microsoft Power Automate"),
    },
  ],
};
