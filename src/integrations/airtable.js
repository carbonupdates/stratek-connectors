// airtable -- Log each sale as a row in an Airtable base you own.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Web API; personal access token + base / table. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "airtable",
  name: "Airtable",
  category: "accounting",
  status: 'planned',
  description: "Log each sale as a row in an Airtable base you own.",
  docsUrl: "https://airtable.com/developers/web/api/introduction",
  secrets: [
    { name: "AIRTABLE_TOKEN", label: "Personal access token" },
    { name: "AIRTABLE_BASE_ID", label: "Base ID" },
    { name: "AIRTABLE_TABLE", label: "Table name" },
  ],
  actions: [
    {
      id: "test",
      label: "Test Airtable",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Airtable"),
    },
    {
      id: "send_sale",
      label: "Send sale to Airtable",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Airtable"),
    },
  ],
};
