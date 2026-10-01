// manager_io -- Send sales to Manager.io (Cloud or Server edition).
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: API 2; business URL + access token. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "manager_io",
  name: "Manager.io",
  category: "accounting",
  status: 'planned',
  description: "Send sales to Manager.io (Cloud or Server edition).",
  docsUrl: "https://www.manager.io/api",
  secrets: [
    { name: "MANAGER_URL", label: "Business API URL (https)" },
    { name: "MANAGER_TOKEN", label: "Access token" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Manager.io",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Manager.io"),
    },
    {
      id: "send_sale",
      label: "Send sale to Manager.io",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Manager.io"),
    },
  ],
};
