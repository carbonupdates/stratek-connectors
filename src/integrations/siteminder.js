// siteminder -- Channel manager: keep room availability and rates in sync across booking sites.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Partner programme (SiteConnect / pmsXchange).

import { notBuilt } from './_scaffold.js';

export default {
  id: "siteminder",
  name: "SiteMinder",
  category: "hospitality",
  status: 'planned',
  description: "Channel manager: keep room availability and rates in sync across booking sites.",
  docsUrl: "https://developer.siteminder.com/",
  secrets: [
    {
      "name": "SITEMINDER_API_KEY",
      "label": "SiteMinder API key"
    },
    {
      "name": "SITEMINDER_PROPERTY_ID",
      "label": "Property ID"
    }
  ],
  actions: [
    {
      id: "availability",
      label: "Room availability (SiteMinder)",
      placement: ["settings"],
      fields: [],
      run: notBuilt("SiteMinder"),
    },
  ],
};
