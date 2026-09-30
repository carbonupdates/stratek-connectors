// made_in_china -- Find verified Chinese manufacturers and send enquiries.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Partner access to confirm.

import { notBuilt } from './_scaffold.js';

export default {
  id: "made_in_china",
  name: "Made-in-China.com",
  category: "sourcing",
  status: 'planned',
  description: "Find verified Chinese manufacturers and send enquiries.",
  docsUrl: "https://www.made-in-china.com/",
  secrets: [
    {
      "name": "MIC_API_KEY",
      "label": "Made-in-China API key"
    }
  ],
  actions: [
    {
      id: "search_products",
      label: "Search Made-in-China suppliers",
      placement: ["settings"],
      fields: [
        {
          "name": "query",
          "label": "What are you looking for?",
          "type": "text",
          "required": true
        }
      ],
      run: notBuilt("Made-in-China.com"),
    },
  ],
};
