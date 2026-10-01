// activecampaign -- Add customers to ActiveCampaign lists.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: API v3; account URL + API key. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "activecampaign",
  name: "ActiveCampaign",
  category: "marketing",
  status: 'planned',
  description: "Add customers to ActiveCampaign lists.",
  docsUrl: "https://developers.activecampaign.com/",
  secrets: [
    { name: "ACTIVECAMPAIGN_URL", label: "Account API URL" },
    { name: "ACTIVECAMPAIGN_KEY", label: "API key" },
  ],
  actions: [
    {
      id: "test",
      label: "Test ActiveCampaign",
      placement: ["settings"],
      fields: [],
      run: notBuilt("ActiveCampaign"),
    },
    {
      id: "add_contact",
      label: "Add customer to ActiveCampaign",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("ActiveCampaign"),
    },
  ],
};
