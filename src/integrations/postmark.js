// postmark -- Email receipts to customers through Postmark.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Email API; server token. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "postmark",
  name: "Postmark",
  category: "messaging",
  status: 'planned',
  description: "Email receipts to customers through Postmark.",
  docsUrl: "https://postmarkapp.com/developer",
  secrets: [
    { name: "POSTMARK_SERVER_TOKEN", label: "Server token" },
    { name: "POSTMARK_FROM", label: "From address" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Postmark",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Postmark"),
    },
    {
      id: "send_receipt",
      label: "Send receipt with Postmark",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Postmark"),
    },
  ],
};
