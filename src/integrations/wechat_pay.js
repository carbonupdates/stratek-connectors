// wechat_pay -- WeChat Pay for Chinese visitors (cross-border).
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Cross-border merchant account through an acquirer (partner).

import { notBuilt } from './_scaffold.js';

export default {
  id: "wechat_pay",
  name: "WeChat Pay",
  category: "payments",
  status: 'planned',
  description: "WeChat Pay for Chinese visitors (cross-border).",
  docsUrl: "https://pay.weixin.qq.com/wiki/doc/api_external/en/index.shtml",
  secrets: [
    {
      "name": "WECHATPAY_MCH_ID",
      "label": "Merchant ID"
    },
    {
      "name": "WECHATPAY_API_KEY",
      "label": "API v3 key"
    },
    {
      "name": "WECHATPAY_APP_ID",
      "label": "App ID"
    }
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with WeChat Pay",
      placement: ["charge"],
      fields: [],
      run: notBuilt("WeChat Pay"),
    },
    {
      id: "check",
      label: "Check WeChat Pay payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("WeChat Pay"),
    },
  ],
};
