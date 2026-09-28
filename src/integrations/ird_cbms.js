// ird_cbms -- Report bills to the Inland Revenue Department (CBMS).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "ird_cbms",
  name: "Nepal IRD e-billing (CBMS)",
  category: "accounting",
  status: 'planned',
  description: "Report bills to the Inland Revenue Department (CBMS).",
  docsUrl: "https://ird.gov.np/",
  secrets: [
    {
      name: "IRD_USERNAME",
      label: "IRD CBMS username"
    },
    {
      name: "IRD_PASSWORD",
      label: "IRD CBMS password"
    },
    {
      name: "IRD_SELLER_PAN",
      label: "Seller PAN"
    }
  ],
  actions: [
    {
      id: "report_bill",
      label: "Report bill to IRD",
      placement: [
        "transaction"
      ],
      fields: [
        {
          name: "buyerPan",
          label: "Buyer PAN (optional)",
          type: "text"
        },
        {
          name: "buyerName",
          label: "Buyer name",
          type: "text"
        }
      ],
      run: notBuilt("Nepal IRD e-billing (CBMS)"),
    },
  ],
};
