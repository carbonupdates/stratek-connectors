// shipstation -- Send orders to ShipStation to print labels with your carriers.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Open REST API (basic auth).

import { notBuilt } from './_scaffold.js';

export default {
  id: "shipstation",
  name: "ShipStation",
  category: "delivery",
  status: 'planned',
  description: "Send orders to ShipStation to print labels with your carriers.",
  docsUrl: "https://www.shipstation.com/docs/api/",
  secrets: [
    {
      "name": "SHIPSTATION_API_KEY",
      "label": "ShipStation API key"
    },
    {
      "name": "SHIPSTATION_API_SECRET",
      "label": "ShipStation API secret"
    }
  ],
  actions: [
    {
      id: "send_order",
      label: "Send order to ShipStation",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("ShipStation"),
    },
    {
      id: "track",
      label: "Track ShipStation shipment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("ShipStation"),
    },
  ],
};
