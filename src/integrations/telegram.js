// telegram -- Sale alerts to a Telegram chat or group.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "telegram",
  name: "Telegram",
  category: "messaging",
  status: 'planned',
  description: "Sale alerts to a Telegram chat or group.",
  docsUrl: "https://core.telegram.org/bots/api",
  secrets: [
    {
      name: "TELEGRAM_BOT_TOKEN",
      label: "Telegram bot token",
      hint: "From @BotFather."
    },
    {
      name: "TELEGRAM_CHAT_ID",
      label: "Chat ID"
    }
  ],
  actions: [
    {
      id: "notify",
      label: "Post sale to Telegram",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("Telegram"),
    },
  ],
};
