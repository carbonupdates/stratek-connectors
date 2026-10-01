// braintree -- Cards and PayPal through Braintree (PayPal company).
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: GraphQL API; merchant ID + public/private key; sandbox is self-serve. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "braintree",
  name: "Braintree",
  category: "payments",
  status: 'planned',
  description: "Cards and PayPal through Braintree (PayPal company).",
  docsUrl: "https://developer.paypal.com/braintree/docs",
  secrets: [
    { name: "BRAINTREE_MERCHANT_ID", label: "Merchant ID" },
    { name: "BRAINTREE_PUBLIC_KEY", label: "Public key" },
    { name: "BRAINTREE_PRIVATE_KEY", label: "Private key" },
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with Braintree",
      placement: ["charge"],
      fields: [],
      run: notBuilt("Braintree"),
    },
    {
      id: "check",
      label: "Check Braintree payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Braintree"),
    },
    {
      id: "refund",
      label: "Refund Braintree payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Braintree"),
    },
  ],
};
