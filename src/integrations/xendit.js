// xendit -- Southeast Asia: QR (QRIS, PromptPay...), e-wallets and virtual accounts through Xendit.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Invoices / Payment Requests API; secret key (test mode self-serve). Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "xendit",
  name: "Xendit",
  category: "payments",
  status: 'planned',
  description: "Southeast Asia: QR (QRIS, PromptPay...), e-wallets and virtual accounts through Xendit.",
  docsUrl: "https://docs.xendit.co/",
  secrets: [
    { name: "XENDIT_SECRET_KEY", label: "Secret key" },
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with Xendit",
      placement: ["charge"],
      fields: [],
      run: notBuilt("Xendit"),
    },
    {
      id: "check",
      label: "Check Xendit payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Xendit"),
    },
    {
      id: "refund",
      label: "Refund Xendit payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Xendit"),
    },
  ],
};
