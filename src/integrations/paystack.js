// paystack -- Africa: cards, bank and mobile money payments through Paystack.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Transaction initialize / verify; secret key (test keys self-serve). Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "paystack",
  name: "Paystack",
  category: "payments",
  status: 'planned',
  description: "Africa: cards, bank and mobile money payments through Paystack.",
  docsUrl: "https://paystack.com/docs/api/",
  secrets: [
    { name: "PAYSTACK_SECRET_KEY", label: "Secret key" },
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with Paystack",
      placement: ["charge"],
      fields: [],
      run: notBuilt("Paystack"),
    },
    {
      id: "check",
      label: "Check Paystack payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Paystack"),
    },
    {
      id: "refund",
      label: "Refund Paystack payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Paystack"),
    },
  ],
};
