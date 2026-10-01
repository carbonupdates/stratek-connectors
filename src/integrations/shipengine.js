// shipengine -- Rates, labels and tracking across many carriers through ShipEngine.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: REST API; API key (sandbox key self-serve). Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "shipengine",
  name: "ShipEngine",
  category: "delivery",
  status: 'planned',
  description: "Rates, labels and tracking across many carriers through ShipEngine.",
  docsUrl: "https://www.shipengine.com/docs/",
  secrets: [
    { name: "SHIPENGINE_API_KEY", label: "API key" },
  ],
  actions: [
    {
      id: "quote",
      label: "Get ShipEngine rates",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("ShipEngine"),
    },
    {
      id: "create_shipment", outbound: true,
      label: "Ship with ShipEngine",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("ShipEngine"),
    },
    {
      id: "track",
      label: "Track ShipEngine shipment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("ShipEngine"),
    },
  ],
};
