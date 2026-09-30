# Stratek <-> connector contract (v1)

Everything a Stratek POS and a connector agree on. The POS draws buttons and
forms from the connector's manifest, so **adding an integration never needs a
POS change** as long as it uses the result types below.

## Parties

| | Where | Holds |
|---|---|---|
| Stratek | `STRATEK_URL` (default `https://strateknepal.com`) | Ed25519 signing key (`STRATEK_SIGNING_KEY` secret) |
| Connector | the shop's (or HQ's) Cloudflare account | integration secrets, pairing (Durable Object `STATE`) |
| Browser | the Stratek dashboard / admin panel | a 1-hour pass |

## 0. Install (what "Activate connector" does)

Stratek installs the connector itself -- no terminal, no GitHub:

1. The shop creates a Cloudflare API token from Stratek's prefilled link
   (*Workers Scripts: Edit*, *Account Settings: Read*) and pastes it into
   Stratek's Integrations tab. Stratek uses it for one request, never stores it.
2. Stratek downloads `dist/connector.json` from this repo (built by
   `npm run bundle`: `{ format: 1, version, mainModule, compatibilityDate,
   durableObjects, migrations, modules: { "<path>.js": "<source>" } }`).
3. Cloudflare API: `GET /accounts` -> `GET|PUT /accounts/:id/workers/subdomain`
   -> `PUT /accounts/:id/workers/scripts/stratek-connector` (multipart: every
   module + metadata with the `STATE` Durable Object, pending migrations,
   `STRATEK_URL`, a one-off `INSTALL_SECRET` secret, `keep_bindings:
   ["secret_text"]` so the shop's integration keys survive updates) ->
   `POST .../scripts/stratek-connector/subdomain { enabled: true }`.
4. Stratek stores a one-time code (SHA-256, 60 minutes) and calls
   `POST <connector>/connect/auto { code, secret }`. The connector checks
   `secret` against `INSTALL_SECRET` (constant time), then does the claim in
   step 1.3 below. Knowing the install secret proves the caller just deployed
   this Worker, so `/connect/auto` may re-pair a connected connector.
   A brand-new `workers.dev` address can take a minute to go live; Stratek
   retries for ~15 s; the Integrations tab then shows step 2 "Connect to
   Stratek", retries `POST .../connectors/finish` (a new code, same secret)
   every 15 s for ~3 minutes, and offers the manual pairing below
   (`<connector>/connect`) as a fallback. After a manual pairing the connector
   redirects back to `admin.html#integrations` / `dashboard.html#integrations`.
5. **Update connector** repeats 1-3 with a fresh token; if the address matches
   the active connector, the pairing (kept in the Durable Object) is untouched.

## 1. Pairing by hand (a connector deployed with `npx wrangler deploy`)

1. `GET <connector>/connect` -> connector stores a random `state` and redirects to
   `<STRATEK_URL>/connect.html?connector=<connector origin>&state=<state>`.
2. A signed-in merchant (or admin, for Stratek HQ) approves:
   `POST /api/v1/merchant/connectors/approve` (or `/api/v1/admin/...`) `{ url, state }`
   -> Stratek stores a one-time code (SHA-256 only, 10 minutes) and returns
   `{ redirect: "<connector>/connect/callback?code=<64 hex>&state=<state>" }`.
3. `GET <connector>/connect/callback` checks `state`, then **server-to-server**
   `POST <STRATEK_URL>/api/v1/connectors/claim { code, url, version }` ->
   `{ connectorId, ownerType: "merchant"|"admin", ownerId, ownerName, issuer }`.
   The connector also fetches `GET /api/v1/connectors/public-key` ->
   `{ issuer, kid, alg: "EdDSA", jwk: { kty: "OKP", crv: "Ed25519", x } }`.
4. One active connector per owner; a new pairing replaces the old one. A paired
   connector refuses `/connect` unless the variable `ALLOW_REPAIR=true` is set.

## 2. Passes

The browser asks Stratek: `POST /api/v1/merchant/connectors/pass` (or admin) ->
`{ token, connectorUrl, connectorId, expiresIn: 3600 }`.

`token` is a JWT, header `{ alg: "EdDSA", typ: "JWT", kid }`, claims:

| Claim | Value |
|---|---|
| `iss` | Stratek origin (must equal the public key's `issuer`) |
| `aud` | `connectorId` |
| `sub` | `merchant:<id>` or `admin:hq` (must match the pairing) |
| `owner_name`, `actor` | shop name, who is signed in |
| `src` | `session` (a person signed in to Stratek), `api_key` (API key / AI agent) or `server` (Stratek itself, e.g. kiosk QR). Only `session` passes may change keys. |
| `int` | Integrations this pass may use: `"*"` (Stratek HQ) or an array of ids chosen by Stratek's admins for the shop (per shop currency). `core` is always allowed. Missing = everything (older Stratek). |
| `iat`, `exp`, `jti` | issued / expires (1 hour) / unique id |

Connectors send it as `Authorization: Bearer <token>`. On an unknown `kid` the
connector re-fetches Stratek's public key (key rotation needs no re-pairing).
CORS: only `Origin: <STRATEK_URL>` is allowed.

## 3. Manifest -- `GET /manifest` (pass required)

```json
{ "success": true, "data": {
  "connector": { "version": "0.8.0", "connectorId": "...", "owner": { "type": "merchant", "id": "1", "name": "Chyau" } },
  "integrations": [
    { "id": "yango", "name": "Yango Delivery", "category": "delivery", "description": "...",
      "status": "available", "docsUrl": "https://...", "ready": true, "testReady": false,
      "test": { "support": "sandbox", "note": null }, "setup": true, "missingSecrets": [], "testSecrets": [],
      "secrets": [ { "name": "YANGO_API_TOKEN", "label": "Yango Delivery API token", "optional": false, "set": true } ],
      "actions": [
        { "id": "create_delivery", "label": "Send with Yango", "placement": ["transaction"],
          "fields": [ { "name": "recipientName", "label": "Recipient name", "type": "text", "required": true } ] } ] } ] } }
```

- Only integrations allowed by the pass's `int` claim are listed; actions and
  key endpoints of others answer `403 NOT_OFFERED`.
- `status`: `available` (built) or `planned` (scaffold -- Stratek lists it as
  "Coming soon", shows no buttons and no Set up; its actions answer 409).
- `category`: `system` | `payments` | `delivery` | `fulfilment` | `messaging` | `accounting` |
  `commerce` | `marketing` | `automation` -- Stratek groups the list by it.
- `ready` = available and every non-optional **live** key is set. Stratek only shows
  buttons for ready integrations; `missingSecrets` lists names (never values).
- `testReady` = the **test** keys are complete (v0.8.0+); `test: { support, note }`
  with `support` = `sandbox` | `real-money` (test keys exist but some payments
  are still real, e.g. Fonepay) | `none` (live only); `testSecrets[]` like
  `secrets[]` for the test set. See section 5b.
- `setup` = Stratek shows a **Set up** / **Change keys** button.
- `secrets[].set` says whether each key is present -- never its value.
- `placement` -- where the button appears:
  - `transaction`: a sale's Details panel (merchant Transactions tab)
  - `charge`: under the payment QR right after charging
  - `settings`: only on the Integrations tab (e.g. Test connection)
  - hidden (never buttons; called by Stratek itself): `qr` (till/kiosk QR),
    `health` (kiosk gate), `delivery` (Pathao `cities`, `zones`, `areas`, `quote`
    for the online store)
- `fields[].type`: `text` | `tel` | `email` | `number`. A field named
  `codAmount` is pre-filled with the sale total.

## 4. Actions -- `POST /actions/<integration>/<action>` (pass required)

Request: `{ "fields": { ... }, "context": { "transaction": { "id", "amount", "currency", "reference", "items", "bill", "createdAt" } }, "mode": "live" | "test" }`

**Outbound actions (v0.9.0+).** Actions that move money out of the shop or
commit it to a real-world cost carry `outbound: true` in the manifest (refunds,
Pathao `create_delivery`, Slant 3D `confirm`; ids starting `refund`,
`create_delivery`, `confirm`, `payout`, `transfer`, `send_money` count as
outbound even if a scaffold forgets the flag). A pass with `src: "api_key"`
(an AI agent / API key) gets `403 APPROVAL_REQUIRED` for them. People
(`session`) and Stratek itself (`server`, after a person approved the agent's
request in the dashboard) can run them.

`mode` (v0.8.0+, default `live`) picks the key set. `test` on an integration
with `support: none` answers `409 NO_TEST_MODE`; missing keys for the chosen
mode answer `409 NOT_READY`. Results of test-mode calls carry `testMode: true`.

Response: `{ "success": true, "data": { "result": <result> } }`, where `result` is one of

| `type` | Fields | Stratek shows |
|---|---|---|
| `message` | `title?`, `text` | a confirmation |
| `link` | `title?`, `text?`, `url` (https), `linkLabel?` | a link (tracking page, payment page...) |
| `qr` | `title?`, `text?`, `qrPayload` | a QR code to scan |
| `status` | `title?`, `status`, `text?` | a status line |
| `list` | `items: [{ id, name, ... }]` | (hidden actions) e.g. Pathao cities / zones / areas |
| `quote` | `price`, `currency` | (hidden) e.g. Pathao delivery price for `context: { cityId, zoneId, weight }` |
| `health` | `ready`, `livemode`, `webhookRegistered`, `webhookId` | (hidden) kiosk gate |

Pathao's `create_delivery` also accepts `context.delivery = { cityId, zoneId, areaId }`
(from the online store) and sends them as `recipient_city/zone/area`.

Errors: `{ "success": false, "error": { "message", "code" } }` -- the message is
shown to the person.

### What an action's `run` receives

`run({ env, claims, fields, context, origin, store, mode })` -- `env` has the shop's
keys for the chosen mode (`env.<NAME>`) plus `env.STRATEK_MODE` (`live`|`test`), `claims` the pass, `fields` the form values, `context.transaction`
the sale, `origin` the connector's own address (e.g. for return URLs; the
connector serves a simple `GET /paid` "thank you" page), and `store` a small
per-integration memory (`await store.get(k)`, `await store.put(k, v)`) kept in
the Durable Object -- e.g. which payment session or consignment belongs to which sale.
Live and test have separate memories (`data:<id>:...` and `data:<id>:test:...`).

Settings actions without fields (e.g. "Test PayBridgeNP") appear as buttons on
Stratek's Integrations tab once the integration is ready. An action can ask
Stratek for extra data with `context: ['menu']`: Stratek then sends
`context.menu = { currency, items: [{ id, name, description, price, category,
available, photo }] }` (photo as an absolute https URL) -- used by "Sync menu to
Facebook/Instagram Shop".

## 5. Keys -- the Set up form

Keys (API keys, client secrets...) are entered on the connector's **own** page,
never in Stratek:

- Stratek opens `GET <connector>/setup/<integration>#pass=<pass>` in a new tab.
  The pass is in the fragment (not sent to any server); the page removes it
  from the address bar, then calls the connector (same origin) with it:
- `GET /secrets/<integration>` (pass) -> `{ id, name, ready, missing: [labels],
  secrets: [ { name, label, hint, optional, set, masked, source } ] }` --
  `masked` like `sk_…4f2a`, `source` = `connector` (Set up form) or `cloudflare`
  (a Cloudflare Secret of the same name).
- `POST /secrets/<integration>` (pass with `src: "session"`) `{ values: { NAME:
  "value" }, remove: [ "NAME" ] }` -> same shape. Only the integration's own key
  names are accepted; empty values mean "keep"; `remove` only clears keys saved
  by the form. Values are at most 4096 characters and never logged.
- The key endpoints send no CORS headers, so Stratek's pages can't read or
  write them. The Set up page has a strict CSP (`connect-src 'self'`).
- Keys are stored in the Durable Object (`secrets`), survive updates and
  disconnects, and are passed to actions as `env.<NAME>` (form value wins over a
  Cloudflare Secret).

## 5b. Test and live keys (v0.8.0+)

Every integration has two key sets, shown as **Live keys** and **Test keys** on
its Set up page.

- `GET /secrets/<integration>?mode=test` / `POST ... { mode: "test", values, remove }`;
  without `mode` = live. Views include `mode` and `test: { support, note }`.
- Stored separately: `secrets` (live) and `secrets_test`; Cloudflare Secret
  fallback for test keys uses the `TEST_` prefix (`TEST_STRIPE_SECRET_KEY`).
- Which set is used is decided by the caller, never guessed: Stratek sends
  `mode: "test"` only for test contexts (online store test mode, the "(test keys)"
  buttons on its Integrations tab). Till, kiosk and live store = live.
- An integration describes its test environment with
  `test: { support, note, omit: [names], extraSecrets: [...], hints: { NAME: '...' } }`
  (default `{ support: 'sandbox' }` with the same key names). Examples: PayPal
  switches to `api-m.sandbox.paypal.com` in test; Meta CAPI's test set adds a
  required `META_TEST_EVENT_CODE`; Coinbase and Slant 3D are `none`.
- `onKeysSaved({ env, store, origin, mode })` runs per mode (PayBridgeNP
  registers `/webhooks/paybridgenp` for live and `/webhooks/paybridgenp/test`
  for test, each with its own signing secret).
- **Migration (one time, on first use of 0.8.0):** saved keys that are clearly
  test keys (`sk_test_`/`pk_test_`/`rk_test_`, PayPal `Mode = sandbox`, a Meta test
  event code) and none that look live are moved to the test set, with the
  integration's webhook record; webhooks registered before at the old address
  keep working as test. Other keys stay live. Recorded as `keys_v2` in the
  Durable Object.

## 6. Payments that report themselves -- webhooks and signed events

- **Provider -> connector:** `POST <connector>/webhooks/<integration>` (live keys)
  or `.../webhooks/<integration>/test` (test keys) (no pass).
  The integration's `webhook({ request, rawBody, env, store, emit })` checks
  the provider's own signature (PayBridgeNP: `X-PayBridgeNP-Signature: t=..,v1=..`,
  HMAC-SHA256 over `"<t>.<raw body>"`, 5-minute window) and re-checks with the
  provider's API.
- **Setup:** an integration may define `onKeysSaved({ env, store, origin })`,
  run when its keys become complete in the Set up form -- PayBridgeNP registers
  `<connector>/webhooks/paybridgenp` there and keeps the signing secret. Its
  return text / error is shown on the Set up page.
- **Connector -> Stratek:** `emit({ id, type, data })` (the connector adds
  `mode: "live" | "test"`) sends
  `POST <STRATEK_URL>/api/v1/connectors/events` with `X-Stratek-Connector:
  <connectorId>` and `X-Stratek-Signature: t=<unix>,sig=<base64url Ed25519 over
  "<t>.<body>">`. The connector's key pair lives in its Durable Object; the
  public key is at `GET <connector>/event-key`, which Stratek fetches from the
  connector address it paired with (cached, re-fetched on rotation).
  Stratek checks signature, time (5 min), duplicate `id`, that the connector is
  active and the sale belongs to its shop, and the exact amount.
- **Event `payment.succeeded`** `data: { transactionId, amount (major units),
  currency, provider, integration (id), webhookId, providerRef, method, livemode }` -> Stratek records
  `provider_paid_at/name/ref/note` on the sale ("Paid online"). It **never
  settles** the sale -- a person presses Settle. Wrong amount or paid after a
  cancel -> flagged with a note. `livemode: false` or event `mode: "test"` ->
  noted "Test-mode payment" and never counts as the kiosk's proof payment.
- **Till / kiosk QR:** an integration with `qrProvider: true` offers a hidden
  action `till_qr` (placement `qr`, never a button) returning `{ type: 'qr',
  qrPayload, provider, refreshAfterSec, livemode }`; calling it again for the
  same sale refreshes the QR. Stratek calls it from the till (browser pass) or,
  for kiosks, from its server (pass with `src: "server"`, 2 minutes).
- **Health (kiosk gate):** a `qrProvider` integration also offers a hidden
  action `health` (placement `health`) returning `{ type: 'health', ready,
  livemode, webhookRegistered, webhookId }`. Stratek's kiosk needs live mode,
  a registered webhook, and a proof payment whose event carried the same
  `webhookId` (so re-saving keys = prove again). Minimum connector: 0.7.1.
- **Delivery notifications (v0.10.0+):** Pathao's webhook
  (`X-PATHAO-Signature` = the shop's saved `PATHAO_WEBHOOK_SECRET`, compared in
  constant time; handshake event `webhook_integration`) is answered `202` with
  `X-Pathao-Merchant-Webhook-Integration-Secret`. A `webhook()` may return a
  `Response` for providers that need a custom status/header. Events for
  `merchant_order_id: STK-<saleId>` whose consignment matches the one this
  connector booked are sent as **`delivery.status`** `data: { transactionId,
  integration: 'pathao', provider, consignmentId, status, event, deliveryFee }`
  (`status`: created, pickup_requested, assigned_for_pickup, picked,
  pickup_failed, pickup_cancelled, at_sorting_hub, in_transit, at_last_mile_hub,
  assigned_for_delivery, delivered, partial_delivery, returned, delivery_failed,
  on_hold, paid_return, exchanged, paid_to_merchant). Stratek only updates the
  online order; it never settles or refunds. An integration can set
  `webhookSetup: { where, what }` so its Set up page shows the callback URL.
- `color` (e.g. `'#e4202a'`) colours an integration's buttons in Stratek.

## 6a-7. Hotels (v0.19.0+)

- `cloudbeds` (v1.2, header `x-api-key`): `getReservations?status=checked_in`
  (room names from `guestList[].rooms[]`), `postCustomItem` as form data with
  `referenceID=stratek-<sale>` (Cloudbeds ignores a repeat), one item per sale line
  + a VAT/service/rounding line (`folioLines()`); guest matching `matchGuest()`.
- `opera_cloud` (OHIP): token `POST {gateway}/oauth/v1/tokens` (client_credentials,
  basic auth, `x-app-key`, `enterpriseId`), `GET /rsv/v1/hotels/{h}/reservations?searchType=InHouse&roomId=`,
  `POST /csh/v1/hotels/{h}/reservations/{id}/charges` (one simple charge,
  `postIt: true`, outlet transaction code). Headers `x-app-key`, `x-hotelid`.
- Both `post_to_room` actions are outbound; one charge per sale (`tx:<id>` memory).

## 6a-6. Shipping & fulfilment (v0.18.0+)

- Shared helper `src/integrations/_ship.js`: the recipient form (`recipientFields`,
  falls back to `context.customer`), `shipperSecrets(P)` / `shipperFrom(env, P)` for
  the pickup address, `skuLines()` (typed "SKU x2" list, else item `sku`, else
  `stratek-<id>`), one shipment per sale (`tx:<id>` in the integration memory),
  `keepLabel()` / `labelResponse()` for labels served from
  `/pay/:int/start/:mode/:token`, and `cachedToken()` for client-credential tokens
  (kept per mode until 60 s before expiry -- one token call, not one per press).
- Integrations: `fedex` (OAuth client credentials; Rate / Ship / Track v1),
  `ups` (OAuth basic; Rating / Shipping v2409, Track v1), `aramex` (JSON web
  services, ClientInfo), `easyship` (2024-09, buy_label synchronous), `shiprocket`
  (API-user login token, 9 days; order -> assign AWB -> label), `shipstation`
  (legacy v1, basic auth), `shipbob` (2025-07, channel found automatically),
  `amazon_mcf` (SP-API Fulfillment Outbound 2020-07-01, LWA refresh token, no SigV4).
- Outbound (need a person): every `create_shipment`, `shipbob/create_order`,
  `amazon_mcf/create_fulfillment`. `shipstation/send_order` is not outbound (no cost).

## 6a-5. OAuth + wave 3 (v0.17.0+)

- `GET /oauth/:int/start/:mode/:state` -> 302 to the provider (one-time state from
  the integration's **connect** action; session pass only). `GET /oauth/:int/callback`
  swaps the code for tokens (client secret as basic auth or in the body, per
  integration) and keeps `{ access_token, refresh_token, expires_at, ... }` in the
  integration memory; `accessToken()` refreshes it. Helpers: `src/integrations/_oauth.js`.
  Actions receive `oauthLink()`.
- Inventory sync helper `_sync.js`: one memory read/write per press, 20 changed
  items per press.
- Hosted files: DHL labels are served from `/pay/dhl/start/:mode/:token` (PDF);
  Viber's link page uses `/pay/viber/start/live/:code`.

## 6a-4. Hosted payment pages + Nepal gateways (v0.15.0+)

- `GET /pay/:int/start/:mode/:token` -> the integration's `payPage()` (e.g. an
  auto-submitting, signed form to eSewa / connectIPS). Tokens are random, one per
  sale charge, stored in the integration memory.
- `GET|POST /pay/:int/return/:mode` -> `payReturn()`: verify with the gateway, then
  `emit()` a signed `payment.succeeded` `{ transactionId, amount, currency: 'NPR',
  provider, integration, providerRef, livemode }` (same event as PayBridgeNP).
  Each payment is reported once (`reported` flag).
- Actions now also receive `emit` (used by "Check ... payment" buttons, only after
  the gateway confirms).
- Integrations: `khalti` (KPG-2 initiate/lookup/refund), `esewa` (ePay v2 form +
  HMAC signature + status API), `connectips` (SHA256withRSA token via WebCrypto,
  PKCS#1 keys wrapped to PKCS#8; validatetxn with basic auth), `ird_cbms`
  (bill / billreturn with BS dates from `_nepal.js`).

## 6a-3. Webhook, Zapier, Make, Slack, Sparrow SMS, Google Sheets, Mailchimp, HubSpot (v0.14.0+)

- Button actions only (placement `transaction`, plus `settings` tests;
  `send_inventory` / `export_inventory` use `context: ['menu']`). Nothing runs by itself.
- Shared helpers in `src/integrations/_hooks.js`: `hookUrl` (https, optional host
  check), `salePayload` (the JSON above), `postJson` (10 s timeout, readable
  errors, optional HMAC signature `X-Stratek-Signature: t=..,v1=..` over `"<t>.<body>"`).
- Stratek adds `context.customer` `{ name, email, phone }` for online-store orders
  (server side for API keys / approved requests; the dashboard fills it in from
  the Online orders list). Fields like `email` / `phone` stay optional in the
  manifest so API callers can rely on the context; the action checks them.
- Google Sheets: RS256 JWT with WebCrypto (`pkcs8` import of the service account
  key), token cached in the integration memory; tabs created with `batchUpdate`.

## 6a-2. Telegram (v0.13.0+)

- Integration `telegram` (category `messaging`, live only): key `TELEGRAM_BOT_TOKEN`.
  `onKeysSaved` calls `getMe` and `setWebhook` (`<connector>/webhooks/telegram`,
  random `secret_token`, `allowed_updates: [message]`) and remembers the bot.
- `POST /webhooks/telegram`: checked with `X-Telegram-Bot-Api-Secret-Token`;
  each `update_id` handled once (Telegram retries). Private chats only.
  `/start <code>` with the one-time code links that account (stored as the
  integration's `owner`); messages from anyone else get no answer. Messages
  from the owner go to the AI employee (`runAgentTurn`, same limits; `continue`
  and `/new`). Webhook handlers now get `storeFor(id)` to reach another
  integration's memory (here the AI employee's).
- Actions: `test` (settings), `notify` "Post sale to Telegram" (transaction),
  hidden (placement `agent`): `link` / `unlink` (session pass only), `status`
  (session or server), `alert` (**server pass only** -- Stratek's alerts;
  the button URL must start with the Stratek address).

## 6a. AI employee (v0.12.0+)

- `POST /agent-key` (Stratek pass, `src` session or server) `{ key: "stk_m_..." }`
  stores the AI employee's Stratek identity in the integration's memory;
  `{ off: true }` forgets it. Never returned by any endpoint.
- Integration `ai_employee` (category `ai`, live keys only): `AI_PROVIDER`
  (anthropic | openai | gemini | custom), `AI_API_KEY`, `AI_MODEL`, optional
  `AI_BASE_URL` (custom) and `AI_DAILY_TOKENS`. Actions: `test` (settings),
  and hidden `task` / `history` / `reset` (placement `agent`) that only run with
  a **session** pass (a signed-in person), never a server pass or API key.
- `task` (src/agent.js): loads Stratek's MCP `tools/list` with the identity,
  asks the model (Anthropic Messages or OpenAI-compatible chat completions,
  Gemini via its OpenAI-compatible endpoint), runs the chosen tools with MCP
  `tools/call`, up to 6 model calls / 30 outgoing calls per turn (free plan),
  then `needsContinue`. History (last 30 messages) and daily token use are kept
  in the integration's memory; tool results are marked as data, not instructions.

## 6b. Storefront (v0.11.0+)

- `POST /storefront` (Stratek pass, `src` session or server) `{ slug, workersDev,
  hostnames: [...] }` or `{ off: true }`; `GET /storefront` returns it.
- Requests to a configured hostname (any path), or to `/shop[/...]` on the
  workers.dev address when `workersDev`, are the store: `/` and
  `/order/<token>` -> Stratek's `/store/<slug>` page with
  `window.STRATEK_STORE = { slug, base }` injected; `/api/<rest>` -> Stratek
  `/api/v1/store/<slug>/<rest>` (GET/POST, 64 KB) with `X-Stratek-Connector`,
  `X-Store-Client-IP`, `X-Store-Origin` and `X-Stratek-Storefront: t=..,sig=..`
  (Ed25519 with the event key over `"<t>.<METHOD>.<path+query>.<ip>.<origin>"`);
  `/js/*`, `/assets/*`, `/media/menu/*` -> Stratek (GET). Everything else on a
  custom hostname is 404.
- Stratek attaches the Worker to the hostname with Cloudflare's Workers Custom
  Domains API using a one-time token from the shop.

## 7. Catalogue file

`npm run bundle` also writes `dist/catalogue.json` -- `{ version, categories,
integrations: [{ id, name, category, status, description, docsUrl, actions:
[labels], secrets: [labels] }] }`. Stratek's admin panel reads it from GitHub to
build the "Availability for merchants" table, so a new integration appears
there as soon as it is pushed (switched off until an admin enables it).

## 8. Other routes

- `POST /connect/auto` -- `{ code, secret }`, used right after Stratek installs
  the connector (section 0). 403 without the right install secret.
- `GET /` -- status page with **Connect to Stratek** (or "Connected to ...").
- `GET /health` -- `{ ok, version, connected }` (no pass).
- `POST /disconnect` (pass) -- forget the pairing; Stratek's Disconnect calls this
  and `DELETE /api/v1/<merchant|admin>/connectors/<id>`.

## Planned (v2)

Signed events from connector to Stratek (e.g. "payment confirmed" -> mark the
sale paid), for payment integrations.
