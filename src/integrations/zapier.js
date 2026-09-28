// zapier -- Start a Zap for each sale (connects to thousands of apps).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "zapier",
  name: "Zapier",
  category: "automation",
  status: 'planned',
  description: "Start a Zap for each sale (connects to thousands of apps).",
  docsUrl: "https://zapier.com/apps/webhook/integrations",
  secrets: [
    {
      name: "ZAPIER_HOOK_URL",
      label: "Zapier catch hook URL"
    }
  ],
  actions: [
    {
      id: "send",
      label: "Send sale to Zapier",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("Zapier"),
    },
  ],
};
