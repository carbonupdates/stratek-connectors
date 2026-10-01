// track17 -- Track any parcel worldwide with 17TRACK.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Tracking API v2; security key. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "track17",
  name: "17TRACK",
  category: "delivery",
  status: 'planned',
  description: "Track any parcel worldwide with 17TRACK.",
  docsUrl: "https://api.17track.net/en/doc",
  secrets: [
    { name: "TRACK17_API_KEY", label: "Security key" },
  ],
  actions: [
    {
      id: "track",
      label: "Track with 17TRACK",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("17TRACK"),
    },
  ],
};
