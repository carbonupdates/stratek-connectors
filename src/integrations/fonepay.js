// fonepay -- Fonepay QR with the exact amount, confirmed automatically (Nepal).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "fonepay",
  name: "Fonepay dynamic QR",
  category: "payments",
  status: 'planned',
  description: "Fonepay QR with the exact amount, confirmed automatically (Nepal).",
  docsUrl: "https://www.fonepay.com/",
  secrets: [
    {
      name: "FONEPAY_MERCHANT_CODE",
      label: "Fonepay merchant code"
    },
    {
      name: "FONEPAY_SECRET_KEY",
      label: "Fonepay secret key"
    },
    {
      name: "FONEPAY_USERNAME",
      label: "Fonepay API username",
      optional: true
    },
    {
      name: "FONEPAY_PASSWORD",
      label: "Fonepay API password",
      optional: true
    }
  ],
  actions: [
    {
      id: "dynamic_qr",
      label: "Fonepay QR for this amount",
      placement: [
        "charge"
      ],
      fields: [],
      run: notBuilt("Fonepay dynamic QR"),
    },
    {
      id: "check",
      label: "Check Fonepay payment",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("Fonepay dynamic QR"),
    },
  ],
};
