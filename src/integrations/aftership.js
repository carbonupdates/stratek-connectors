// aftership -- Track any parcel from 1,000+ carriers in one place.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Tracking API; API key. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "aftership",
  name: "AfterShip Tracking",
  category: "delivery",
  status: 'planned',
  description: "Track any parcel from 1,000+ carriers in one place.",
  docsUrl: "https://www.aftership.com/docs/tracking",
  secrets: [
    { name: "AFTERSHIP_API_KEY", label: "API key" },
  ],
  actions: [
    {
      id: "track",
      label: "Track with AfterShip Tracking",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("AfterShip Tracking"),
    },
  ],
};
