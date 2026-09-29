// meta_catalog -- Keep a Facebook/Instagram shop catalogue in step with the POS menu.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "meta_catalog",
  name: "Meta Catalog (Facebook & Instagram Shop)",
  category: "commerce",
  status: 'planned',
  description: "Keep a Facebook/Instagram shop catalogue in step with the POS menu.",
  docsUrl: "https://developers.facebook.com/docs/marketing-api/catalog",
  secrets: [
    {
      name: "META_CATALOG_ID",
      label: "Catalog ID"
    },
    {
      name: "META_SYSTEM_USER_TOKEN",
      label: "System user access token"
    }
  ],
  actions: [
    {
      id: "sync_menu",
      label: "Sync menu to Facebook/Instagram Shop",
      placement: [
        "settings"
      ],
      fields: [],
      run: notBuilt("Meta Catalog (Facebook & Instagram Shop)"),
    },
  ],
};
