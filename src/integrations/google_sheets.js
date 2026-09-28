// google_sheets -- Add each sale as a row in a Google Sheet.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "google_sheets",
  name: "Google Sheets",
  category: "accounting",
  status: 'planned',
  description: "Add each sale as a row in a Google Sheet.",
  docsUrl: "https://developers.google.com/sheets/api",
  secrets: [
    {
      name: "GOOGLE_SERVICE_ACCOUNT_JSON",
      label: "Service account key (JSON)",
      hint: "Paste the whole JSON file; share the sheet with the service account email."
    },
    {
      name: "GOOGLE_SHEET_ID",
      label: "Sheet ID",
      hint: "The long ID in the sheet address."
    }
  ],
  actions: [
    {
      id: "add_row",
      label: "Add sale to Google Sheet",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("Google Sheets"),
    },
  ],
};
