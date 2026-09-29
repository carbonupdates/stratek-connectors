// meta_capi -- Send each sale to Meta (Facebook/Instagram Ads) as a Purchase event so ad results are measured.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "meta_capi",
  name: "Meta Conversions API",
  category: "marketing",
  status: 'planned',
  description: "Send each sale to Meta (Facebook/Instagram Ads) as a Purchase event so ad results are measured.",
  docsUrl: "https://developers.facebook.com/docs/marketing-api/conversions-api",
  secrets: [
    {
      name: "META_PIXEL_ID",
      label: "Pixel / dataset ID"
    },
    {
      name: "META_CAPI_TOKEN",
      label: "Conversions API access token"
    },
    {
      name: "META_TEST_EVENT_CODE",
      label: "Test event code",
      hint: "Only while testing in Events Manager.",
      optional: true
    }
  ],
  actions: [
    {
      id: "send_purchase",
      label: "Send sale to Meta Ads",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("Meta Conversions API"),
    },
  ],
};
