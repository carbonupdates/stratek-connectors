// line -- Owner alerts and customer receipts on LINE (Japan, Thailand, Taiwan).
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Messaging API; channel access token. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "line",
  name: "LINE",
  category: "messaging",
  status: 'planned',
  description: "Owner alerts and customer receipts on LINE (Japan, Thailand, Taiwan).",
  docsUrl: "https://developers.line.biz/en/docs/messaging-api/",
  secrets: [
    { name: "LINE_CHANNEL_TOKEN", label: "Channel access token" },
    { name: "LINE_OWNER_ID", label: "Your LINE user ID" },
  ],
  actions: [
    {
      id: "test",
      label: "Test LINE",
      placement: ["settings"],
      fields: [],
      run: notBuilt("LINE"),
    },
    {
      id: "send",
      label: "Post sale to LINE",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("LINE"),
    },
  ],
};
