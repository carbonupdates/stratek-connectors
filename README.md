# Stratek connectors

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/carbonupdates/stratek-connectors)

A **connector** is a small Cloudflare Worker that runs in **your own Cloudflare
account** and connects the [Stratek POS](https://strateknepal.com) to other
services -- delivery (Pathao), payments, and more. It holds your integration
keys; Stratek never sees them. When an integration's keys are set, its buttons
(e.g. **Send with Pathao**) appear in Stratek automatically.

- One connector per shop, in the shop's Cloudflare account (free plan is fine).
- Stratek HQ runs its own connector for Stratek's own needs.
- Same code for everyone. What a shop gets depends only on which keys are added.
- Public code: anyone can check exactly what it does. No keys are ever stored here.

## Set up (about 3 minutes)

1. **Activate.** In Stratek, open **Integrations** and press **Activate connector**
   (or use the button at the top of this page). Sign in to the shop's Cloudflare
   account and press **Deploy**. There is nothing to fill in.
2. **Connect.** When Cloudflare shows the connector's address
   (`https://stratek-connector.<account>.workers.dev`), open it and press
   **Connect to Stratek**. Sign in to Stratek if asked, then approve.
3. **Turn on integrations.** In Cloudflare: **Workers & Pages -> stratek-connector ->
   Settings -> Variables and Secrets -> Add** -- add the keys for an integration as
   **Secrets** (names below). Within a minute its buttons appear in Stratek, and
   Stratek's Integrations tab shows it as **Ready**.

## Integrations

| Integration | Buttons in Stratek | Secrets to add | Status |
|---|---|---|---|
| Connector (built in) | Test connection | -- | Available |
| Pathao | Send with Pathao (on a sale) | `PATHAO_CLIENT_ID`, `PATHAO_CLIENT_SECRET` | Coming next |

New integrations arrive with connector updates -- nothing to reinstall.

## Updates

The Deploy button creates a **copy** of this repo in the deployer's GitHub
account. To keep a copy up to date automatically, add the update job once:

1. Open [`extras/update-connector.yml`](extras/update-connector.yml) and copy its contents.
2. In your copy on GitHub: **Add file -> Create new file**, name it
   `.github/workflows/update-connector.yml`, paste, **Commit changes**.

From then on it pulls the latest version from this repo every day and
Cloudflare redeploys. To update right away: your copy -> **Actions -> Update
connector -> Run workflow**. Stratek's Integrations tab shows when an update is
available. Don't edit shop copies by hand -- keys belong in Cloudflare.

(The job isn't included automatically because Cloudflare's Deploy button can't
create GitHub workflow files; a copy that contained one would fail to set up.)

## Security

- **Keys** live only in the shop's Cloudflare account (as Secrets).
- **Who can use it:** every request needs a pass that Stratek signs (Ed25519)
  for this connector and this shop, valid for one hour. The connector checks it
  with Stratek's public key. Browsers may call it only from the Stratek site.
- **Pairing** happens once, with a one-time code exchanged server-to-server.
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
