// viber -- Order updates and receipts on Viber (popular in Nepal).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Viber REST Bot API (the customer subscribes to your bot) or Viber Business Messages via a partner.

import { notBuilt } from './_scaffold.js';

export default {
  id: "viber",
  name: "Viber",
  category: "messaging",
  status: 'planned',
  description: "Order updates and receipts on Viber (popular in Nepal).",
  docsUrl: "https://developers.viber.com/docs/api/rest-bot-api/",
  secrets: [
    {
      "name": "VIBER_BOT_TOKEN",
      "label": "Viber bot token"
    }
  ],
  actions: [
    {
      id: "send_receipt",
      label: "Send receipt on Viber",
      placement: ["transaction"],
      fields: [
        {
          "name": "phone",
          "label": "Customer phone",
          "type": "tel"
        }
      ],
      run: notBuilt("Viber"),
    },
  ],
};
