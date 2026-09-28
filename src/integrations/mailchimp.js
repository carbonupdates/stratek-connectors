// mailchimp -- Add customers to a Mailchimp audience.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "mailchimp",
  name: "Mailchimp",
  category: "marketing",
  status: 'planned',
  description: "Add customers to a Mailchimp audience.",
  docsUrl: "https://mailchimp.com/developer/marketing/api/",
  secrets: [
    {
      name: "MAILCHIMP_API_KEY",
      label: "Mailchimp API key"
    },
    {
      name: "MAILCHIMP_AUDIENCE_ID",
      label: "Audience ID"
    }
  ],
  actions: [
    {
      id: "add_customer",
      label: "Add customer to Mailchimp",
      placement: [
        "transaction"
      ],
      fields: [
        {
          name: "email",
          label: "Customer email",
          type: "email",
          required: true
        },
        {
          name: "name",
          label: "Customer name",
          type: "text"
        }
      ],
      run: notBuilt("Mailchimp"),
    },
  ],
};
