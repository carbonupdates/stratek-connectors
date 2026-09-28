# Stratek connectors

A **connector** is a small Cloudflare Worker that runs in **your own Cloudflare
account** and connects the [Stratek POS](https://strateknepal.com) to other
services -- delivery (Pathao), payments, and more. It holds your integration
keys; Stratek never sees them. When an integration's keys are set, its buttons
(e.g. **Send with Pathao**) appear in Stratek automatically.

- One connector per shop, in the shop's Cloudflare account (free plan is fine).
- Stratek HQ runs its own connector for Stratek's own needs.
- Same code for everyone. What a shop gets depends only on which keys are added.
- Public code: anyone can check exactly what it does. No keys are ever stored here.

## Set up (about 2 minutes, no terminal)

Everything happens in Stratek -> **Integrations** (merchant dashboard for a
shop; admin panel for Stratek HQ):

1. **Cloudflare account.** The shop needs one (free). No account yet? The tab
   links to Cloudflare's sign-up.
2. **Create token.** Opens Cloudflare's token page with everything filled in
   (*Workers Scripts: Edit*, *Account Settings: Read*). Scroll down ->
   **Continue to summary** -> **Create Token** -> **Copy**.
3. **Paste it and press Activate connector.** Stratek installs the connector
   into that Cloudflare account, turns on its `stratek-connector.<name>.workers.dev`
   address and connects it. The token is used once and never stored -- you can
   delete it in Cloudflare afterwards.
4. **Turn on integrations.** In Cloudflare: **Workers & Pages -> stratek-connector ->
   Settings -> Variables and Secrets -> Add** -- add the keys for an integration as
   **Secrets** (names below). Within a minute its buttons appear in Stratek, and
   the Integrations tab shows it as **Ready**.

**Developers / by hand:** clone this repo, `npm install`, `npx wrangler deploy`,
then in Stratek -> Integrations -> "Already deployed a connector yourself?" paste
the address and press Connect.

(Cloudflare's "Deploy to Cloudflare" button isn't used: it currently fails on
Cloudflare's side -- the copy it makes contains only `wrangler.jsonc`,
[cloudflare/workers-sdk#14553](https://github.com/cloudflare/workers-sdk/issues/14553) --
and it would need a GitHub account per shop.)

## Integrations

| Integration | Buttons in Stratek | Secrets to add | Status |
|---|---|---|---|
| Connector (built in) | Test connection | -- | Available |
| Pathao | Send with Pathao (on a sale) | `PATHAO_CLIENT_ID`, `PATHAO_CLIENT_SECRET` | Coming next |

New integrations arrive with connector updates (**Update connector** in Stratek).

## Updates

When a new version is released, Stratek's Integrations tab shows **Update
available**. Press **Update connector**, make a fresh token with the same
**Create token** button and paste it. The connection and the shop's keys are
kept. (Deployed by hand? `git pull` then `npx wrangler deploy`, or use Update
connector.)

Releasing a version (maintainers): change `src/`, bump the version in
`package.json` and `src/version.js`, `npm run bundle`, `npm test`, push.
`dist/connector.json` is what Stratek installs.

## Security

- **Keys** live only in the shop's Cloudflare account (as Secrets).
- **Who can use it:** every request needs a pass that Stratek signs (Ed25519)
  for this connector and this shop, valid for one hour. The connector checks it
  with Stratek's public key. Browsers may call it only from the Stratek site.
- **Install tokens** are used by Stratek for one request and never stored or
  logged. They only allow editing Workers in that account.
- **Pairing** happens once, with a one-time code exchanged server-to-server
  (after an install, the connector also has to prove a one-off install secret).
  Once connected, a connector can't be re-paired by anyone else; press
  **Disconnect** in Stratek first (or set the variable `ALLOW_REPAIR=true` in
  Cloudflare to recover a connector whose Stratek account is gone).

## For developers

- How Stratek and a connector talk: [CONNECTORS.md](CONNECTORS.md)
- Adding an integration: [docs/adding-an-integration.md](docs/adding-an-integration.md)
- Deploying from the command line (e.g. for many shops):
  `CLOUDFLARE_ACCOUNT_ID=<shop account id> npx wrangler deploy` (log in with
  `npx wrangler login`, which must have access to that account).
- Tests: `npm test` (Node 20+).
