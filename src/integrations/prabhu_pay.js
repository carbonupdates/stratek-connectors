// prabhu_pay -- Prabhu Pay wallet checkout (Nepal).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Merchant API (merchant agreement).

import { notBuilt } from './_scaffold.js';

export default {
  id: "prabhu_pay",
  name: "Prabhu Pay",
  category: "payments",
  status: 'planned',
  description: "Prabhu Pay wallet checkout (Nepal).",
  docsUrl: "https://prabhupay.com/",
  secrets: [
    {
      "name": "PRABHUPAY_MERCHANT_ID",
      "label": "Prabhu Pay merchant ID"
    },
    {
      "name": "PRABHUPAY_SECRET",
      "label": "Secret key"
    }
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with Prabhu Pay",
      placement: ["charge"],
      fields: [],
      run: notBuilt("Prabhu Pay"),
    },
    {
      id: "check",
      label: "Check Prabhu Pay payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Prabhu Pay"),
    },
  ],
};
