// razorpay -- UPI, cards and payment links for customers from India.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "razorpay",
  name: "Razorpay (UPI)",
  category: "payments",
  status: 'planned',
  description: "UPI, cards and payment links for customers from India.",
  docsUrl: "https://razorpay.com/docs/api/",
  secrets: [
    {
      name: "RAZORPAY_KEY_ID",
      label: "Razorpay key ID"
    },
    {
      name: "RAZORPAY_KEY_SECRET",
      label: "Razorpay key secret"
    }
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with UPI (Razorpay)",
      placement: [
        "charge"
      ],
      fields: [],
      run: notBuilt("Razorpay (UPI)"),
    },
    {
      id: "refund",
      label: "Refund with Razorpay",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("Razorpay (UPI)"),
    },
  ],
};
