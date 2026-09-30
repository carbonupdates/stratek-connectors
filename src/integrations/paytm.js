// paytm -- Paytm and UPI checkout (India, for INR shops).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Paytm Payment Gateway API.

import { notBuilt } from './_scaffold.js';

export default {
  id: "paytm",
  name: "Paytm",
  category: "payments",
  status: 'planned',
  description: "Paytm and UPI checkout (India, for INR shops).",
  docsUrl: "https://business.paytm.com/docs",
  secrets: [
    {
      "name": "PAYTM_MID",
      "label": "Paytm merchant ID"
    },
    {
      "name": "PAYTM_MERCHANT_KEY",
      "label": "Merchant key"
    }
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with Paytm",
      placement: ["charge"],
      fields: [],
      run: notBuilt("Paytm"),
    },
    {
      id: "check",
      label: "Check Paytm payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Paytm"),
    },
  ],
};
