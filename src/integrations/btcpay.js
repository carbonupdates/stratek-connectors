// btcpay -- Bitcoin payments through your own BTCPay Server (no middleman).
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Greenfield API; server URL + store ID + API key. Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "btcpay",
  name: "BTCPay Server",
  category: "payments",
  status: 'planned',
  description: "Bitcoin payments through your own BTCPay Server (no middleman).",
  docsUrl: "https://docs.btcpayserver.org/API/Greenfield/v1/",
  secrets: [
    { name: "BTCPAY_URL", label: "BTCPay Server URL (https)" },
    { name: "BTCPAY_STORE_ID", label: "Store ID" },
    { name: "BTCPAY_API_KEY", label: "API key" },
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with BTCPay Server",
      placement: ["charge"],
      fields: [],
      run: notBuilt("BTCPay Server"),
    },
    {
      id: "check",
      label: "Check BTCPay Server payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("BTCPay Server"),
    },
  ],
};
