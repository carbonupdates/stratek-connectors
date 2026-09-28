// stripe -- Card payments and payment links (international cards, Apple Pay, Google Pay).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "stripe",
  name: "Stripe",
  category: "payments",
  status: 'planned',
  description: "Card payments and payment links (international cards, Apple Pay, Google Pay).",
  docsUrl: "https://docs.stripe.com/api",
  secrets: [
    {
      name: "STRIPE_SECRET_KEY",
      label: "Stripe secret key",
      hint: "Starts with sk_live_ (or sk_test_ for testing). Stripe Dashboard -> Developers -> API keys."
    },
    {
      name: "STRIPE_WEBHOOK_SECRET",
      label: "Webhook signing secret",
      hint: "Starts with whsec_. Needed later to mark sales paid automatically.",
      optional: true
    }
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay by card (Stripe)",
      placement: [
        "charge"
      ],
      fields: [],
      run: notBuilt("Stripe"),
    },
    {
      id: "refund",
      label: "Refund with Stripe",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("Stripe"),
    },
  ],
};
