# Adding an integration

Every integration is one file in `src/integrations/`, listed in
`src/integrations/catalogue.js`. Most of the big ones already exist as
**scaffolds** (`status: 'planned'`): their buttons and key fields are drafted,
Stratek lists them as "Coming soon". Building one means filling it in.

## Building a scaffold (e.g. Stripe, Pathao, Yango)

1. Open `src/integrations/<id>.js`. Check the key fields (`secrets`) and
   buttons (`actions`) against the real API and adjust them.
2. Write each action's `run` (replace `notBuilt(...)`):

```js
export default {
  id: 'example',                 // lowercase, used in URLs
  name: 'Example',
  category: 'automation',        // payments | delivery | fulfilment | messaging | accounting | commerce | marketing | automation
  status: 'available',           // was 'planned'
  description: 'What it does, in one line.',
  docsUrl: 'https://api.example.com/docs',
  // Keys the Set up form asks for. Stratek shows the labels; values reach run() as env.<name>.
  secrets: [
    { name: 'EXAMPLE_API_KEY', label: 'Example API key', hint: 'Dashboard -> Developers -> API keys.' },
    { name: 'EXAMPLE_REGION', label: 'Region', optional: true },
  ],
  actions: [{
    id: 'do_thing',
    label: 'Do the thing',       // button text in Stratek
    placement: ['transaction'],  // transaction | charge | settings
    fields: [{ name: 'note', label: 'Note', type: 'text' }],
    async run({ env, fields, context, claims, origin, store }) {
      // origin = this connector's address; store = small memory for this integration
      // env.EXAMPLE_API_KEY is the shop's key. context.transaction is the sale.
      const res = await fetch('https://api.example.com/things', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.EXAMPLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: context.transaction?.amount, note: fields.note }),
      });
      if (!res.ok) throw new Error(`Example said no (${res.status}).`); // shown to the person
      const data = await res.json();
      return { type: 'link', title: 'Done', text: 'Track it here:', url: data.url, linkLabel: 'Open' };
    },
  }],
};
```

3. Set `status: 'available'`. The Set up form, the Ready badge and the buttons
   in Stratek then work by themselves -- no Stratek change needed.
4. After release, a Stratek admin switches it on for the right shops in
   Admin -> **Integration Permissions** (per shop currency,
   with a note). Until then no shop sees it.

Tips: add a `settings` action without fields named "Test <name>" that checks
the keys (Stratek shows it on the Integrations tab); keep ids of remote objects
in `store` keyed by sale (`tx:<id>`); use idempotency keys when the API has
them; see `src/integrations/paybridgenp.js` and `pathao.js` for complete examples,
and `test/integrations.test.js` for testing against a stand-in API.

Payment integrations that should confirm sales by themselves: add
`webhook(...)` (check the provider's signature, then `await emit({ id, type:
'payment.succeeded', data: { transactionId, amount, currency, provider,
providerRef } })`), `onKeysSaved(...)` to register the webhook, and for a
till/kiosk QR `qrProvider: true` plus a `till_qr` action (placement `qr`) and
a `health` action (placement `health`, returns `{ livemode, webhookRegistered,
webhookId }`) -- the kiosk gate needs it. Include `integration` and `webhookId`
in the `payment.succeeded` event data. See
CONNECTORS.md section 6 and `paybridgenp.js`.

## Test and live keys (every integration)

Declare the provider's test environment next to `secrets` (see CONNECTORS.md 5b):

```js
test: {
  support: 'sandbox',            // or 'real-money' (e.g. Fonepay) or 'none' (live only)
  note: 'Shown on the Set up page.',
  hints: { MY_KEY: 'Test key from ... (starts with sk_test_)' },
  omit: [],                      // live-only key names
  extraSecrets: [],              // test-only keys, e.g. Meta's test event code
},
```

In `run`, `env` already holds the keys of the chosen mode; branch on
`env.STRATEK_MODE === 'test'` only when the provider needs a different address
(PayPal sandbox). Providers where the merchant pastes the callback URL by hand
(e.g. Pathao) set `webhookSetup: { where, what }` so the Set up page shows
`/webhooks/<id>` and `/webhooks/<id>/test`; `webhook()` may return a `Response`
when the provider wants a special status or header. Webhook integrations register `/webhooks/<id>` for live and
`/webhooks/<id>/test` for test in `onKeysSaved({ mode })`. Add a case to
`test/modes.test.js`.

## Outbound actions

Mark any action that sends money out of the shop or books something that costs
money with `outbound: true` (refunds, deliveries, paying a supplier). AI agents
and API keys can then only *request* it; a person approves it in Stratek.
Read-only actions (test, check, track, quotes) need nothing.

## A brand-new integration

Create `src/integrations/<id>.js` like the example (use `status: 'planned'` and
`notBuilt('<Name>')` for a scaffold), import it in `catalogue.js`, and add a row
to the table in `README.md`.

## Releasing

Bump `version` in `package.json` and `CONNECTOR_VERSION` in `src/version.js`
(same number), run `npm run bundle` (rebuilds `dist/connector.json`, the file
Stratek installs, and `dist/catalogue.json`, the list Stratek's admin panel shows) and `npm test` (fails if the bundle is out of date). Push.
Every shop's Integrations tab then shows "Update available"; **Update
connector** + a fresh token installs it. Changes pushed without a version bump
reach only new installs -- always bump when `src/` changes.

Only plain JavaScript in `src/` (no npm packages at runtime): Stratek uploads
the files as they are, without a build step.

Rules: never log or return secret values; keep each action under Cloudflare's
free-plan limits (10 ms CPU, 50 outbound requests per call); return one of the
result types in [CONNECTORS.md](../CONNECTORS.md).

## Shared helpers (src/integrations/)

Reuse these instead of writing your own: `_util.js` (sale(), money in minor
units), `_hooks.js` (customerOf(), sale payloads, https-only URLs), `_nepal.js`
(BS dates, hosted form / result pages, emitPaid), `_oauth.js` (Connect buttons,
token refresh), `_sync.js` (inventory push, 20 per press) and `_ship.js`
(delivery form, pickup address, SKU lists, labels, one shipment per sale,
cached access tokens) and `_receipt.js` (receipt text / HTML for SMS and email).
Anything that spends money sets `outbound: true`.
