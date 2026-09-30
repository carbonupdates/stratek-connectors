// alipay -- Alipay+ wallets for visitors, as their own checkout (Fonepay QRs already accept Alipay+).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Alipay+ acquiring partner onboarding.

import { notBuilt } from './_scaffold.js';

export default {
  id: "alipay",
  name: "Alipay+ (direct)",
  category: "payments",
  status: 'planned',
  description: "Alipay+ wallets for visitors, as their own checkout (Fonepay QRs already accept Alipay+).",
  docsUrl: "https://docs.alipayplus.com/",
  secrets: [
    {
      "name": "ALIPAYPLUS_CLIENT_ID",
      "label": "Client ID"
    },
    {
      "name": "ALIPAYPLUS_PRIVATE_KEY",
      "label": "Private key (PEM)"
    }
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with Alipay+",
      placement: ["charge"],
      fields: [],
      run: notBuilt("Alipay+ (direct)"),
    },
    {
      id: "check",
      label: "Check Alipay+ payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Alipay+ (direct)"),
    },
  ],
};
