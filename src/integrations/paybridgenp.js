// paybridgenp -- PayBridgeNP payment gateway (Nepal).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "paybridgenp",
  name: "PayBridgeNP",
  category: "payments",
  status: 'planned',
  description: "PayBridgeNP payment gateway (Nepal).",
  docsUrl: null,
  secrets: [
    {
      name: "PAYBRIDGE_API_KEY",
      label: "PayBridgeNP API key"
    },
    {
      name: "PAYBRIDGE_SECRET",
      label: "PayBridgeNP secret",
      optional: true
    }
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with PayBridgeNP",
      placement: [
        "charge"
      ],
      fields: [],
      run: notBuilt("PayBridgeNP"),
    },
  ],
};
