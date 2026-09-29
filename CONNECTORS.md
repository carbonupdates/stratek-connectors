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
| `src` | `session` (a person signed in to Stratek) or `api_key` (API key / AI agent). Only `session` passes may change keys. |
| `int` | Integrations this pass may use: `"*"` (Stratek HQ) or an array of ids chosen by Stratek's admins for the shop (per shop currency). `core` is always allowed. Missing = everything (older Stratek). |
| `iat`, `exp`, `jti` | issued / expires (1 hour) / unique id |

Connectors send it as `Authorization: Bearer <token>`. On an unknown `kid` the
connector re-fetches Stratek's public key (key rotation needs no re-pairing).
CORS: only `Origin: <STRATEK_URL>` is allowed.

## 3. Manifest -- `GET /manifest` (pass required)

```json
{ "success": true, "data": {
  "connector": { "version": "0.4.0", "connectorId": "...", "owner": { "type": "merchant", "id": "1", "name": "Chyau" } },
  "integrations": [
    { "id": "yango", "name": "Yango Delivery", "category": "delivery", "description": "...",
      "status": "available", "docsUrl": "https://...", "ready": true, "setup": true, "missingSecrets": [],
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
- `ready` = available and every non-optional key is set. Stratek only shows
  buttons for ready integrations; `missingSecrets` lists names (never values).
- `setup` = Stratek shows a **Set up** / **Change keys** button.
- `secrets[].set` says whether each key is present -- never its value.
- `placement` -- where the button appears:
  - `transaction`: a sale's Details panel (merchant Transactions tab)
  - `charge`: under the payment QR right after charging
  - `settings`: only on the Integrations tab (e.g. Test connection)
- `fields[].type`: `text` | `tel` | `email` | `number`. A field named
  `codAmount` is pre-filled with the sale total.

## 4. Actions -- `POST /actions/<integration>/<action>` (pass required)

Request: `{ "fields": { ... }, "context": { "transaction": { "id", "amount", "currency", "reference", "items", "bill", "createdAt" } } }`

Response: `{ "success": true, "data": { "result": <result> } }`, where `result` is one of

| `type` | Fields | Stratek shows |
|---|---|---|
| `message` | `title?`, `text` | a confirmation |
| `link` | `title?`, `text?`, `url` (https), `linkLabel?` | a link (tracking page, payment page...) |
| `qr` | `title?`, `text?`, `qrPayload` | a QR code to scan |
| `status` | `title?`, `status`, `text?` | a status line |

Errors: `{ "success": false, "error": { "message", "code" } }` -- the message is
shown to the person.

### What an action's `run` receives

`run({ env, claims, fields, context, origin, store })` -- `env` has the shop's
keys (`env.<NAME>`), `claims` the pass, `fields` the form values, `context.transaction`
the sale, `origin` the connector's own address (e.g. for return URLs; the
connector serves a simple `GET /paid` "thank you" page), and `store` a small
per-integration memory (`await store.get(k)`, `await store.put(k, v)`) kept in
the Durable Object -- e.g. which payment session or consignment belongs to which sale.

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

## 6. Catalogue file

`npm run bundle` also writes `dist/catalogue.json` -- `{ version, categories,
integrations: [{ id, name, category, status, description, docsUrl, actions:
[labels], secrets: [labels] }] }`. Stratek's admin panel reads it from GitHub to
build the "Availability for merchants" table, so a new integration appears
there as soon as it is pushed (switched off until an admin enables it).

## 7. Other routes

- `POST /connect/auto` -- `{ code, secret }`, used right after Stratek installs
  the connector (section 0). 403 without the right install secret.
- `GET /` -- status page with **Connect to Stratek** (or "Connected to ...").
- `GET /health` -- `{ ok, version, connected }` (no pass).
- `POST /disconnect` (pass) -- forget the pairing; Stratek's Disconnect calls this
  and `DELETE /api/v1/<merchant|admin>/connectors/<id>`.

## Planned (v2)

Signed events from connector to Stratek (e.g. "payment confirmed" -> mark the
sale paid), for payment integrations.
