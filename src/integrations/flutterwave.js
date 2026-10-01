// flutterwave -- Africa: cards, mobile money and bank transfer links through Flutterwave.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Payments API; secret key (test keys self-serve). Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "flutterwave",
  name: "Flutterwave",
  category: "payments",
  status: 'planned',
  description: "Africa: cards, mobile money and bank transfer links through Flutterwave.",
  docsUrl: "https://developer.flutterwave.com/",
  secrets: [
    { name: "FLUTTERWAVE_SECRET_KEY", label: "Secret key" },
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with Flutterwave",
      placement: ["charge"],
      fields: [],
      run: notBuilt("Flutterwave"),
    },
    {
      id: "check",
      label: "Check Flutterwave payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Flutterwave"),
    },
    {
      id: "refund",
      label: "Refund Flutterwave payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Flutterwave"),
    },
  ],
};
