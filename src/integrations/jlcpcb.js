// jlcpcb -- Order PCBs, PCB assembly (SMT), stencils and 3D prints from JLCPCB (China).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: JLCPCB API platform (application required): quote, order and track PCB / SMT / 3D orders.

import { notBuilt } from './_scaffold.js';

export default {
  id: "jlcpcb",
  name: "JLCPCB",
  category: "fulfilment",
  status: 'planned',
  description: "Order PCBs, PCB assembly (SMT), stencils and 3D prints from JLCPCB (China).",
  docsUrl: "https://api.jlcpcb.com/",
  secrets: [
    {
      "name": "JLCPCB_APP_KEY",
      "label": "JLCPCB API app key",
      "hint": "Apply for API access on the JLCPCB API platform."
    },
    {
      "name": "JLCPCB_APP_SECRET",
      "label": "JLCPCB API app secret"
    }
  ],
  actions: [
    {
      id: "quote",
      label: "Quote PCB (JLCPCB)",
      placement: ["settings"],
      fields: [
        {
          "name": "fileUrl",
          "label": "Gerber zip link (https://)",
          "type": "text",
          "required": true
        },
        {
          "name": "quantity",
          "label": "Quantity",
          "type": "number",
          "required": true
        }
      ],
      run: notBuilt("JLCPCB"),
    },
    {
      id: "confirm_order",
      label: "Order PCB (JLCPCB)",
      placement: ["settings"],
      fields: [
        {
          "name": "quoteId",
          "label": "Quote ID",
          "type": "text",
          "required": true
        }
      ],
      run: notBuilt("JLCPCB"),
    },
    {
      id: "track",
      label: "Track JLCPCB order",
      placement: ["settings"],
      fields: [
        {
          "name": "orderId",
          "label": "Order number",
          "type": "text",
          "required": true
        }
      ],
      run: notBuilt("JLCPCB"),
    },
  ],
};
