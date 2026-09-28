// esewa -- eSewa wallet payments (Nepal).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "esewa",
  name: "eSewa",
  category: "payments",
  status: 'planned',
  description: "eSewa wallet payments (Nepal).",
  docsUrl: "https://developer.esewa.com.np/",
  secrets: [
    {
      name: "ESEWA_MERCHANT_CODE",
      label: "eSewa merchant (product) code"
    },
    {
      name: "ESEWA_SECRET_KEY",
      label: "eSewa secret key"
    }
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with eSewa",
      placement: [
        "charge"
      ],
      fields: [],
      run: notBuilt("eSewa"),
    },
    {
      id: "check",
      label: "Check eSewa payment",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("eSewa"),
    },
  ],
};
