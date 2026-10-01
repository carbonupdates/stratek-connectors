// ntfy -- Free push alerts to the owner's phone (ntfy.sh or your own server).
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Publish to a topic URL (+ optional access token). Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "ntfy",
  name: "ntfy",
  category: "messaging",
  status: 'planned',
  description: "Free push alerts to the owner's phone (ntfy.sh or your own server).",
  docsUrl: "https://docs.ntfy.sh/publish/",
  secrets: [
    { name: "NTFY_TOPIC_URL", label: "Topic URL (https)" },
    { name: "NTFY_TOKEN", label: "Access token (optional)", optional: true },
  ],
  actions: [
    {
      id: "test",
      label: "Test ntfy",
      placement: ["settings"],
      fields: [],
      run: notBuilt("ntfy"),
    },
    {
      id: "send",
      label: "Post sale to ntfy",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("ntfy"),
    },
  ],
};
