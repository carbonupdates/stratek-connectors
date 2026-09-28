// khalti -- Khalti wallet payments (Nepal).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "khalti",
  name: "Khalti",
  category: "payments",
  status: 'planned',
  description: "Khalti wallet payments (Nepal).",
  docsUrl: "https://docs.khalti.com/",
  secrets: [
    {
      name: "KHALTI_SECRET_KEY",
      label: "Khalti live secret key",
      hint: "Khalti merchant dashboard -> Keys."
    }
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with Khalti",
      placement: [
        "charge"
      ],
      fields: [],
      run: notBuilt("Khalti"),
    },
    {
      id: "check",
      label: "Check Khalti payment",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("Khalti"),
    },
  ],
};
