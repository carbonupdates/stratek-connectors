// payoneer -- Request payments from international clients with Payoneer.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Payoneer API (partner programme).

import { notBuilt } from './_scaffold.js';

export default {
  id: "payoneer",
  name: "Payoneer",
  category: "payments",
  status: 'planned',
  description: "Request payments from international clients with Payoneer.",
  docsUrl: "https://developer.payoneer.com/",
  secrets: [
    {
      "name": "PAYONEER_CLIENT_ID",
      "label": "Payoneer client ID"
    },
    {
      "name": "PAYONEER_CLIENT_SECRET",
      "label": "Payoneer client secret"
    }
  ],
  actions: [
    {
      id: "payment_link",
      label: "Request payment (Payoneer)",
      placement: ["charge"],
      fields: [],
      run: notBuilt("Payoneer"),
    },
    {
      id: "check",
      label: "Check Payoneer payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Payoneer"),
    },
  ],
};
