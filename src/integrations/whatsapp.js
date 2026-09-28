// whatsapp -- Send receipts and payment QRs on WhatsApp (Meta Cloud API).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "whatsapp",
  name: "WhatsApp Business",
  category: "messaging",
  status: 'planned',
  description: "Send receipts and payment QRs on WhatsApp (Meta Cloud API).",
  docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
  secrets: [
    {
      name: "WHATSAPP_TOKEN",
      label: "WhatsApp access token"
    },
    {
      name: "WHATSAPP_PHONE_NUMBER_ID",
      label: "WhatsApp phone number ID"
    }
  ],
  actions: [
    {
      id: "send_receipt",
      label: "Send receipt on WhatsApp",
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
      run: notBuilt("WhatsApp Business"),
    },
    {
      id: "send_payment_link",
      label: "Send payment QR on WhatsApp",
      placement: [
        "charge"
      ],
      fields: [
        {
          name: "phone",
          label: "Customer phone",
          type: "tel",
          required: true
        }
      ],
      run: notBuilt("WhatsApp Business"),
    },
  ],
};
