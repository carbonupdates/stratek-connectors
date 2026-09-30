// pcbway -- Quote and order PCBs and assembly from PCBWay (China).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: PCBWay Partner API (application required).

import { notBuilt } from './_scaffold.js';

export default {
  id: "pcbway",
  name: "PCBWay",
  category: "fulfilment",
  status: 'planned',
  description: "Quote and order PCBs and assembly from PCBWay (China).",
  docsUrl: "https://api-partner.pcbway.com/",
  secrets: [
    {
      "name": "PCBWAY_API_KEY",
      "label": "PCBWay partner API key",
      "hint": "Apply through PCBWay API cooperation."
    }
  ],
  actions: [
    {
      id: "quote",
      label: "Quote PCB (PCBWay)",
      placement: ["settings"],
      fields: [
        {
          "name": "layers",
          "label": "Layers",
          "type": "number",
          "required": true
        },
        {
          "name": "width",
          "label": "Width (mm)",
          "type": "number",
          "required": true
        },
        {
          "name": "height",
          "label": "Height (mm)",
          "type": "number",
          "required": true
        },
        {
          "name": "quantity",
          "label": "Quantity",
          "type": "number",
          "required": true
        }
      ],
      run: notBuilt("PCBWay"),
    },
    {
      id: "confirm_order",
      label: "Order PCB (PCBWay)",
      placement: ["settings"],
      fields: [
        {
          "name": "quoteId",
          "label": "Quote / cart ID",
          "type": "text",
          "required": true
        }
      ],
      run: notBuilt("PCBWay"),
    },
    {
      id: "track",
      label: "Track PCBWay order",
      placement: ["settings"],
      fields: [
        {
          "name": "orderId",
          "label": "Order number",
          "type": "text",
          "required": true
        }
      ],
      run: notBuilt("PCBWay"),
    },
  ],
};
