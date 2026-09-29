// paybridgenp -- eSewa, Khalti and Fonepay in one hosted checkout, confirmed by signed webhooks (Nepal).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "paybridgenp",
  name: "PayBridgeNP",
  category: "payments",
  status: 'planned',
  description: "eSewa, Khalti and Fonepay in one hosted checkout, confirmed by signed webhooks (Nepal).",
  docsUrl: "https://docs.paybridgenp.com/api-reference/overview",
  secrets: [
    {
      name: "PAYBRIDGE_SECRET_KEY",
      label: "PayBridgeNP secret key",
      hint: "Starts with sk_live_ (or sk_test_ for testing). Note: Fonepay has no sandbox -- test payments move real money."
    },
    {
      name: "PAYBRIDGE_WEBHOOK_SECRET",
      label: "Webhook signing secret",
      hint: "Needed to confirm payments automatically.",
      optional: true
    }
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay online (eSewa / Khalti / Fonepay)",
      placement: [
        "charge"
      ],
      fields: [],
      run: notBuilt("PayBridgeNP"),
    },
    {
      id: "check",
      label: "Check PayBridgeNP payment",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("PayBridgeNP"),
    },
    {
      id: "refund",
      label: "Refund with PayBridgeNP",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("PayBridgeNP"),
    },
  ],
};
