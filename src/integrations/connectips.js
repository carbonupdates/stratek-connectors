// connectips -- Bank account payments through connectIPS (Nepal).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "connectips",
  name: "connectIPS",
  category: "payments",
  status: 'planned',
  description: "Bank account payments through connectIPS (Nepal).",
  docsUrl: "https://www.connectips.com/",
  secrets: [
    {
      name: "CONNECTIPS_MERCHANT_ID",
      label: "Merchant ID"
    },
    {
      name: "CONNECTIPS_APP_ID",
      label: "App ID"
    },
    {
      name: "CONNECTIPS_APP_NAME",
      label: "App name"
    },
    {
      name: "CONNECTIPS_PASSWORD",
      label: "App password"
    },
    {
      name: "CONNECTIPS_PRIVATE_KEY",
      label: "Private key (PEM)",
      hint: "Paste the whole key including the BEGIN/END lines."
    }
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with connectIPS",
      placement: [
        "charge"
      ],
      fields: [],
      run: notBuilt("connectIPS"),
    },
  ],
};
