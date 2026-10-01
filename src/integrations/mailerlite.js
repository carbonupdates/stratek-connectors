// mailerlite -- Add customers to MailerLite groups.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: API; API token. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "mailerlite",
  name: "MailerLite",
  category: "marketing",
  status: 'planned',
  description: "Add customers to MailerLite groups.",
  docsUrl: "https://developers.mailerlite.com/",
  secrets: [
    { name: "MAILERLITE_TOKEN", label: "API token" },
    { name: "MAILERLITE_GROUP_ID", label: "Group ID (optional)", optional: true },
  ],
  actions: [
    {
      id: "test",
      label: "Test MailerLite",
      placement: ["settings"],
      fields: [],
      run: notBuilt("MailerLite"),
    },
    {
      id: "add_contact",
      label: "Add customer to MailerLite",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("MailerLite"),
    },
  ],
};
