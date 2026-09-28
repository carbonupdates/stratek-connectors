// make -- Start a Make scenario for each sale.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "make",
  name: "Make",
  category: "automation",
  status: 'planned',
  description: "Start a Make scenario for each sale.",
  docsUrl: "https://www.make.com/en/help/tools/webhooks",
  secrets: [
    {
      name: "MAKE_WEBHOOK_URL",
      label: "Make webhook URL"
    }
  ],
  actions: [
    {
      id: "send",
      label: "Send sale to Make",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("Make"),
    },
  ],
};
