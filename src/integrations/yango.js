// yango -- Same-day courier deliveries with Yango.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "yango",
  name: "Yango Delivery",
  category: "delivery",
  status: 'planned',
  description: "Same-day courier deliveries with Yango.",
  docsUrl: "https://yango.com/",
  secrets: [
    {
      name: "YANGO_API_TOKEN",
      label: "Yango Delivery API token"
    },
    {
      name: "YANGO_PICKUP_ADDRESS",
      label: "Pickup address",
      hint: "Your shop address, used for every delivery."
    }
  ],
  actions: [
    {
      id: "create_delivery",
      label: "Send with Yango",
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
      run: notBuilt("Yango Delivery"),
    },
    {
      id: "track",
      label: "Track Yango delivery",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("Yango Delivery"),
    },
  ],
};
