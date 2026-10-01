// mercado_pago -- Latin America: payment links and QR through Mercado Pago.
//
// STATUS: planned (scaffold, wave 10). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Checkout Pro preferences / QR; access token (test credentials self-serve). Self-serve: the business creates the key itself (no app review).

import { notBuilt } from './_scaffold.js';

export default {
  id: "mercado_pago",
  name: "Mercado Pago",
  category: "payments",
  status: 'planned',
  description: "Latin America: payment links and QR through Mercado Pago.",
  docsUrl: "https://www.mercadopago.com/developers",
  secrets: [
    { name: "MERCADOPAGO_ACCESS_TOKEN", label: "Access token" },
  ],
  actions: [
    {
      id: "payment_link",
      label: "Pay with Mercado Pago",
      placement: ["charge"],
      fields: [],
      run: notBuilt("Mercado Pago"),
    },
    {
      id: "check",
      label: "Check Mercado Pago payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Mercado Pago"),
    },
    {
      id: "refund",
      label: "Refund Mercado Pago payment",
      placement: ["transaction"],
      fields: [],
      run: notBuilt("Mercado Pago"),
    },
  ],
};
