// paypal -- PayPal checkout links for international customers.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "paypal",
  name: "PayPal",
  category: "payments",
  status: 'planned',
  description: "PayPal checkout links for international customers.",
  docsUrl: "https://developer.paypal.com/api/rest/",
  secrets: [
    {
      name: "PAYPAL_CLIENT_ID",
      label: "PayPal client ID",
      hint: "PayPal Developer -> Apps & Credentials."
    },
    {
      name: "PAYPAL_CLIENT_SECRET",
      label: "PayPal client secret"
    },
    {
      name: "PAYPAL_MODE",
      label: "Mode",
      hint: "live or sandbox (default live).",
      optional: true
    }
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with PayPal",
      placement: [
        "charge"
      ],
      fields: [],
      run: notBuilt("PayPal"),
    },
    {
      id: "refund",
      label: "Refund with PayPal",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("PayPal"),
    },
  ],
};
