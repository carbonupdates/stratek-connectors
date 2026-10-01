// nowpayments -- Crypto checkout in 300+ coins through NOWPayments.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Invoice API; API key + IPN secret (sandbox self-serve). Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "nowpayments",
  name: "NOWPayments",
  category: "payments",
  status: 'planned',
  description: "Crypto checkout in 300+ coins through NOWPayments.",
  docsUrl: "https://documenter.getpostman.com/view/7907941/2s93JusNJt",
  secrets: [
    { name: "NOWPAYMENTS_API_KEY", label: "API key" },
    { name: "NOWPAYMENTS_IPN_SECRET", label: "IPN secret" },
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with NOWPayments",
      placement: ["charge"],
      fields: [],
      run: notBuilt("NOWPayments"),
    },
    {
      id: "check",
      label: "Check NOWPayments payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("NOWPayments"),
    },
  ],
};
