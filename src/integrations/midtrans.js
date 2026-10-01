// midtrans -- Indonesia: QRIS, GoPay, cards and bank transfer through Midtrans.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Snap / Core API; server key (sandbox self-serve). Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "midtrans",
  name: "Midtrans",
  category: "payments",
  status: 'planned',
  description: "Indonesia: QRIS, GoPay, cards and bank transfer through Midtrans.",
  docsUrl: "https://docs.midtrans.com/",
  secrets: [
    { name: "MIDTRANS_SERVER_KEY", label: "Server key" },
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with Midtrans",
      placement: ["charge"],
      fields: [],
      run: notBuilt("Midtrans"),
    },
    {
      id: "check",
      label: "Check Midtrans payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Midtrans"),
    },
    {
      id: "refund",
      label: "Refund Midtrans payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Midtrans"),
    },
  ],
};
