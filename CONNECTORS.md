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

## 1. Pairing (once)

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
| `iat`, `exp`, `jti` | issued / expires (1 hour) / unique id |

Connectors send it as `Authorization: Bearer <token>`. On an unknown `kid` the
connector re-fetches Stratek's public key (key rotation needs no re-pairing).
CORS: only `Origin: <STRATEK_URL>` is allowed.

## 3. Manifest -- `GET /manifest` (pass required)

```json
{ "success": true, "data": {
  "connector": { "version": "0.1.0", "connectorId": "...", "owner": { "type": "merchant", "id": "1", "name": "Chyau" } },
  "integrations": [
    { "id": "pathao", "name": "Pathao", "description": "...", "ready": true, "missingSecrets": [],
      "actions": [
        { "id": "create_delivery", "label": "Send with Pathao", "placement": ["transaction"],
          "fields": [ { "name": "recipientName", "label": "Recipient name", "type": "text", "required": true } ] } ] } ] } }
```

- `ready` = every secret the integration needs is set. Stratek only shows
  buttons for ready integrations; `missingSecrets` lists names (never values).
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

## 5. Other routes

- `GET /` -- status page with **Connect to Stratek** (or "Connected to ...").
- `GET /health` -- `{ ok, version, connected }` (no pass).
- `POST /disconnect` (pass) -- forget the pairing; Stratek's Disconnect calls this
  and `DELETE /api/v1/<merchant|admin>/connectors/<id>`.

## Planned (v2)

Signed events from connector to Stratek (e.g. "payment confirmed" -> mark the
sale paid), for payment integrations.
