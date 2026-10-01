// google_merchant -- Show your products on Google Shopping (free listings).
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Merchant API; service account (self-serve Google Cloud project). Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "google_merchant",
  name: "Google Merchant Center",
  category: "commerce",
  status: 'planned',
  description: "Show your products on Google Shopping (free listings).",
  docsUrl: "https://developers.google.com/merchant/api",
  secrets: [
    { name: "GOOGLE_MERCHANT_ID", label: "Merchant Center ID" },
    { name: "GOOGLE_SERVICE_ACCOUNT_JSON", label: "Service account key (JSON)" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Google Merchant Center",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Google Merchant Center"),
    },
    {
      id: "sync_menu",
      label: "Sync products to Google",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Google Merchant Center"),
    },
  ],
};
