// ime_pay -- IME Pay wallet checkout (Nepal).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: IME Pay merchant e-payment API (merchant agreement).

import { notBuilt } from './_scaffold.js';

export default {
  id: "ime_pay",
  name: "IME Pay",
  category: "payments",
  status: 'planned',
  description: "IME Pay wallet checkout (Nepal).",
  docsUrl: "https://www.imepay.com.np/",
  secrets: [
    {
      "name": "IMEPAY_MERCHANT_CODE",
      "label": "IME Pay merchant code"
    },
    {
      "name": "IMEPAY_API_USER",
      "label": "API user"
    },
    {
      "name": "IMEPAY_API_PASSWORD",
      "label": "API password"
    },
    {
      "name": "IMEPAY_MODULE",
      "label": "Module name"
    }
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with IME Pay",
      placement: ["charge"],
      fields: [],
      run: notBuilt("IME Pay"),
    },
    {
      id: "check",
      label: "Check IME Pay payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("IME Pay"),
    },
  ],
};
