// pickndrop -- Pick & Drop Nepal courier deliveries.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "pickndrop",
  name: "Pick & Drop",
  category: "delivery",
  status: 'planned',
  description: "Pick & Drop Nepal courier deliveries.",
  docsUrl: "https://pickndropnepal.com/",
  secrets: [
    {
      name: "PICKNDROP_API_KEY",
      label: "Pick & Drop API key"
    }
  ],
  actions: [
    {
      id: "create_delivery",
      label: "Send with Pick & Drop",
      placement: [
        "transaction"
      ],
      fields: [
        {
          name: "recipientName",
          label: "Recipient name",
          type: "text",
          required: true
        },
        {
          name: "recipientPhone",
          label: "Recipient phone",
          type: "tel",
          required: true
        },
        {
          name: "recipientAddress",
          label: "Delivery address",
          type: "text",
          required: true
        },
        {
          name: "codAmount",
          label: "Cash to collect (0 if paid)",
          type: "number",
          required: true,
          default: 0
        },
        {
          name: "note",
          label: "Note for rider",
          type: "text"
        }
      ],
      run: notBuilt("Pick & Drop"),
    },
  ],
};
