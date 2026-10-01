// akaunting -- Send sales to Akaunting (free accounting app).
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: REST API; site URL + login (basic). Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "akaunting",
  name: "Akaunting",
  category: "accounting",
  status: 'planned',
  description: "Send sales to Akaunting (free accounting app).",
  docsUrl: "https://akaunting.com/hc/docs/developers/api",
  secrets: [
    { name: "AKAUNTING_URL", label: "Akaunting URL (https)" },
    { name: "AKAUNTING_EMAIL", label: "Email" },
    { name: "AKAUNTING_PASSWORD", label: "Password" },
    { name: "AKAUNTING_COMPANY_ID", label: "Company ID" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Akaunting",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Akaunting"),
    },
    {
      id: "send_sale",
      label: "Send sale to Akaunting",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Akaunting"),
    },
  ],
};
