// notion -- Log each sale in a Notion database.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: API; internal integration token + database ID. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "notion",
  name: "Notion",
  category: "accounting",
  status: 'planned',
  description: "Log each sale in a Notion database.",
  docsUrl: "https://developers.notion.com/",
  secrets: [
    { name: "NOTION_TOKEN", label: "Internal integration token" },
    { name: "NOTION_DATABASE_ID", label: "Database ID" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Notion",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Notion"),
    },
    {
      id: "send_sale",
      label: "Send sale to Notion",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Notion"),
    },
  ],
};
