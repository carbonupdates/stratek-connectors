// coinbase -- Crypto payment links through Coinbase Developer Platform, confirmed by webhook.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "coinbase",
  name: "Coinbase (crypto)",
  category: "payments",
  status: 'planned',
  description: "Crypto payment links through Coinbase Developer Platform, confirmed by webhook.",
  docsUrl: "https://docs.cdp.coinbase.com/",
  secrets: [
    {
      name: "COINBASE_API_KEY_NAME",
      label: "CDP API key name / ID"
    },
    {
      name: "COINBASE_API_PRIVATE_KEY",
      label: "CDP API private key",
      hint: "Paste the whole key."
    },
    {
      name: "COINBASE_WEBHOOK_SECRET",
      label: "Webhook secret",
      optional: true
    }
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with crypto (Coinbase)",
      placement: [
        "charge"
      ],
      fields: [],
      run: notBuilt("Coinbase (crypto)"),
    },
    {
      id: "check",
      label: "Check crypto payment",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("Coinbase (crypto)"),
    },
  ],
};
