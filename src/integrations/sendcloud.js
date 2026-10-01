// sendcloud -- Europe: shipping labels, returns and tracking through Sendcloud.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Shipping API; public + secret key. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "sendcloud",
  name: "Sendcloud",
  category: "delivery",
  status: 'planned',
  description: "Europe: shipping labels, returns and tracking through Sendcloud.",
  docsUrl: "https://api.sendcloud.dev/",
  secrets: [
    { name: "SENDCLOUD_PUBLIC_KEY", label: "Public key" },
    { name: "SENDCLOUD_SECRET_KEY", label: "Secret key" },
  ],
  actions: [
    {
      id: "quote",
      label: "Get Sendcloud rates",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Sendcloud"),
    },
    {
      id: "create_shipment", outbound: true,
      label: "Ship with Sendcloud",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Sendcloud"),
    },
    {
      id: "track",
      label: "Track Sendcloud shipment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Sendcloud"),
    },
  ],
};
