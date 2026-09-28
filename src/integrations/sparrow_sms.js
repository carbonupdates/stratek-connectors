// sparrow_sms -- SMS receipts and alerts (Nepal).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "sparrow_sms",
  name: "Sparrow SMS",
  category: "messaging",
  status: 'planned',
  description: "SMS receipts and alerts (Nepal).",
  docsUrl: "https://sparrowsms.com/",
  secrets: [
    {
      name: "SPARROW_SMS_TOKEN",
      label: "Sparrow SMS token"
    },
    {
      name: "SPARROW_SMS_FROM",
      label: "Sender ID"
    }
  ],
  actions: [
    {
      id: "send_receipt",
      label: "Send receipt by SMS",
      placement: [
        "transaction"
      ],
      fields: [
        {
          name: "phone",
          label: "Customer phone",
          type: "tel",
          required: true
        }
      ],
      run: notBuilt("Sparrow SMS"),
    },
  ],
};
