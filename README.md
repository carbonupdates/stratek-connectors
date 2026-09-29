# Stratek connectors

A **connector** is a small Cloudflare Worker that runs in **your own Cloudflare
account** and connects the [Stratek POS](https://strateknepal.com) to other
services: payments, delivery, messaging, accounting and tax, online stores,
marketing and automation. It holds your integration keys; Stratek never sees
them. When an integration is set up, its buttons (e.g. **Pay by card**,
**Send with a courier**, **Send receipt on WhatsApp**) appear in Stratek
automatically.

- One connector per shop, in the shop's Cloudflare account (free plan is fine).
- Stratek HQ runs its own connector for Stratek's own needs.
- Same code for everyone. What a shop gets depends only on which integrations
  are set up (i.e. what was bought with the POS) -- there's no per-shop code.
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
   **Step 2, Connect to Stratek**, normally happens by itself. A brand-new
   address can take a minute or two to go live: the tab keeps trying, or press
   **Connect now**. If it still won't connect, press **Connect on the connector
   page** -- it opens the connector, which sends you back to Stratek to approve
   (*Connect for Stratek HQ (admin)* or *Connect to my shop*) and then returns you
   to the Integrations tab.
4. **Set up integrations.** In the same tab, press **Set up** next to an
   integration. A page from the shop's own connector opens; enter the keys and
   press **Save keys**. Back in Stratek it shows **Ready** and its buttons
   appear. Nobody needs to open Cloudflare for this. (Keys can also be added as
   Cloudflare Secrets with the names in the integration's file; a key saved in
   the Set up form wins.)

**Developers / by hand:** clone this repo, `npm install`, `npx wrangler deploy`,
then in Stratek -> Integrations -> "Already deployed a connector yourself?" paste
the address and press Connect.

(Cloudflare's "Deploy to Cloudflare" button isn't used: it currently fails on
Cloudflare's side -- the copy it makes contains only `wrangler.jsonc`,
[cloudflare/workers-sdk#14553](https://github.com/cloudflare/workers-sdk/issues/14553) --
and it would need a GitHub account per shop.)

## Integrations

The catalogue below is what the connector knows. **Which of them a shop can
use is decided by Stratek's admins** (Admin -> Integrations -> Availability, per
shop currency -- e.g. NPR for shops in Nepal); a shop only sees and can use
those, and the connector refuses the rest. **Available** ones can be set up
today; **Coming soon** ones are scaffolds (buttons and key fields drafted,
code not written yet) -- Stratek lists them but shows no buttons until a
connector update makes them available. Key fields may change when each one is
built.

### Live keys and test keys (v0.8.0+)

Every integration's **Set up** page has two sections: **Live keys** (real
customers, real money) and optional **Test keys**. Where each set is used is
fixed, not a switch you can forget:

- **Live keys:** the till, the kiosk, the live online store -- everything real.
- **Test keys:** only where Stratek says "test": the online store's test mode
  and the **"(test keys)"** buttons on Stratek's Integrations tab.

The Integrations tab shows **Test keys ✓** when a test set is saved, or **Live
only** when the provider has no test environment (Coinbase, Slant 3D). Test
payments are marked "Test-mode payment" in Stratek and never count as real
proof (e.g. for the kiosk). PayBridgeNP: Fonepay has no sandbox, so a test-mode
Fonepay payment still moves real money (capped).

**Updating from an older version:** keys you saved before that are clearly test
keys (`sk_test_...`, PayPal "sandbox" mode, a Meta test event code) move to
**Test keys** automatically; everything else stays **Live**. Re-save PayBridgeNP's
keys once afterwards so both live and test payment notifications are registered.

### Connector

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| Connector | Test connection | -- | -- | **Available** |

### Payments

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| [Stripe](https://docs.stripe.com/api) | Test Stripe, Pay by card (Stripe), Check card payment, Refund card payment | Stripe secret key | Test keys | **Available** |
| [PayPal](https://developer.paypal.com/api/rest/) | Test PayPal, Pay with PayPal, Check PayPal payment, Refund PayPal payment | PayPal client ID, PayPal client secret | Test keys | **Available** |
| [Khalti](https://docs.khalti.com/) | Pay with Khalti, Check Khalti payment | Khalti live secret key | -- | Coming soon |
| [eSewa](https://developer.esewa.com.np/) | Pay with eSewa, Check eSewa payment | eSewa merchant (product) code, eSewa secret key | -- | Coming soon |
| [Fonepay dynamic QR](https://www.fonepay.com/) | Fonepay QR for this amount, Check Fonepay payment | Fonepay merchant code, Fonepay secret key, Fonepay API username (optional), Fonepay API password (optional) | -- | Coming soon |
| [connectIPS](https://www.connectips.com/) | Pay with connectIPS | Merchant ID, App ID, App name, App password, Private key (PEM) | -- | Coming soon |
| [PayBridgeNP](https://docs.paybridgenp.com/api-reference/overview) | Till & kiosk payment QR (auto-detects payment), Test PayBridgeNP, Check online payment, Refund online payment | PayBridgeNP secret key | Test keys (Fonepay = real money) | **Available** |
| [Razorpay (UPI)](https://razorpay.com/docs/api/) | Pay with UPI (Razorpay), Refund with Razorpay | Razorpay key ID, Razorpay key secret | -- | Coming soon |
| [Coinbase (crypto)](https://docs.cdp.coinbase.com/coinbase-business/) | Test Coinbase, Pay with crypto (Coinbase), Check crypto payment, Refund crypto payment | CDP API key ID / name, CDP API private key (Ed25519, base64) | Live only | **Available** |

### Delivery & rides

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| [Pathao](https://merchant.pathao.com/courier/developer-api) | Test Pathao, Send with Pathao, Track Pathao delivery | Pathao API base URL, Client ID, Client secret, Pathao merchant login email, Pathao merchant password, Store ID (optional) | Test keys | **Available** |
| [Yango Delivery](https://yango.com/) | Send with Yango, Track Yango delivery | Yango Delivery API token, Pickup address | -- | Coming soon |
| [Pick & Drop](https://pickndropnepal.com/) | Send with Pick & Drop | Pick & Drop API key | -- | Coming soon |
| inDrive | Send with inDrive | inDrive API key | -- | Coming soon |
| [DHL Express](https://developer.dhl.com/) | Ship with DHL, Track DHL shipment | DHL API key, DHL API secret, DHL account number | -- | Coming soon |

### Manufacturing & fulfilment

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| [Slant 3D](https://slant3dapi.com/documentation/introduction) | Test Slant 3D, Quote 3D print (Slant 3D), Confirm 3D print order, Track 3D print | Slant 3D API key, Platform ID (optional) | Live only | **Available** |

### Messages & notifications

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| [WhatsApp Business](https://developers.facebook.com/docs/whatsapp/cloud-api) | Send receipt on WhatsApp, Send payment QR on WhatsApp | WhatsApp access token, WhatsApp phone number ID | -- | Coming soon |
| [Sparrow SMS](https://sparrowsms.com/) | Send receipt by SMS | Sparrow SMS token, Sender ID | -- | Coming soon |
| [Telegram](https://core.telegram.org/bots/api) | Post sale to Telegram | Telegram bot token, Chat ID | -- | Coming soon |
| [Slack](https://api.slack.com/messaging/webhooks) | Post sale to Slack | Slack incoming webhook URL | -- | Coming soon |

### Accounting & tax

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| [Nepal IRD e-billing (CBMS)](https://ird.gov.np/) | Report bill to IRD | IRD CBMS username, IRD CBMS password, Seller PAN | -- | Coming soon |
| [QuickBooks Online](https://developer.intuit.com/app/developer/qbo/docs/get-started) | Send sale to QuickBooks | Client ID, Client secret, Refresh token, Company (realm) ID | -- | Coming soon |
| [Xero](https://developer.xero.com/documentation/) | Send sale to Xero | Client ID, Client secret, Refresh token, Tenant ID | -- | Coming soon |
| [Google Sheets](https://developers.google.com/sheets/api) | Add sale to Google Sheet | Service account key (JSON), Sheet ID | -- | Coming soon |

### Online stores & marketplaces

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| [Shopify](https://shopify.dev/docs/api/admin-rest) | Sync menu to Shopify, Record sale in Shopify | Store domain, Admin API access token | -- | Coming soon |
| [WooCommerce](https://woocommerce.github.io/woocommerce-rest-api-docs/) | Sync menu to WooCommerce, Record sale in WooCommerce | Store address, Consumer key, Consumer secret | -- | Coming soon |
| [Daraz](https://open.daraz.com/) | Sync stock to Daraz | App key, App secret, Access token | -- | Coming soon |
| [Meta Catalog (Facebook & Instagram Shop)](https://developers.facebook.com/docs/marketing-api/catalog-batch/) | Test Meta Catalog, Sync menu to Facebook/Instagram Shop | Catalog ID, System user access token, Shop web address (optional), Graph API version (optional) | Test keys | **Available** |

### Customers & marketing

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| [Mailchimp](https://mailchimp.com/developer/marketing/api/) | Add customer to Mailchimp | Mailchimp API key, Audience ID | -- | Coming soon |
| [HubSpot](https://developers.hubspot.com/docs/api/overview) | Add customer to HubSpot | Private app access token | -- | Coming soon |
| [Meta Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api) | Test Meta Conversions API, Send sale to Meta Ads | Pixel / dataset ID, Conversions API access token, Graph API version (optional) | Test keys | **Available** |

### Automation

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| Webhook | Send sale to webhook | Webhook address (https://), Signing secret (optional) | -- | Coming soon |
| [Zapier](https://zapier.com/apps/webhook/integrations) | Send sale to Zapier | Zapier catch hook URL | -- | Coming soon |
| [Make](https://www.make.com/en/help/tools/webhooks) | Send sale to Make | Make webhook URL | -- | Coming soon |

### Using PayBridgeNP (available) -- the till & kiosk QR that sees payments

1. **In PayBridgeNP:** connect the shop's **Fonepay merchant account** (money goes
   there). Live Fonepay QRs need a PayBridgeNP **Pro** plan.
2. Stratek admin enables PayBridgeNP for the shop (Availability, NPR).
3. Integrations -> PayBridgeNP -> **Set up**: paste the secret key (`sk_test_...`
   to try, `sk_live_...` for real; the key needs payment + webhook permissions).
   Saving it **registers payment notifications automatically** -- the Set up
   page says "payment notifications are switched on". Press **Test PayBridgeNP**.
4. Tick **Use for the till & kiosk QR** on the PayBridgeNP row.

From then on:

- **Charge total** (till) and **Pay with QR** (kiosk) show a **Fonepay QR from
  PayBridgeNP** with the exact amount, instead of the shop's own QR -- any bank
  app or wallet that reads Fonepay QRs can pay it. It refreshes by itself every
  ~3 minutes (same payment).
- When the customer pays, PayBridgeNP notifies the connector (signed), the
  connector double-checks with PayBridgeNP and tells Stratek (signed). The sale
  shows **"Payment received"** at the till and **"Paid online ✓"** in
  Transactions; the kiosk says "Thank you".
- **A person still confirms:** press **Settle Payment** at the till, or later in
  Transactions (e.g. if the sale left the till). Nothing settles by itself.
- Not paid within 30 minutes: the sale is cancelled automatically (no money
  moved). Paid late after a cancel, or a wrong amount: flagged "check".
- If PayBridgeNP can't make a QR (offline, plan, Fonepay not connected) or the
  amount is under Rs 10, the till shows the shop's own QR as before (a kiosk refuses the order instead).

**Kiosk mode needs this.** A kiosk (self-service screen) only works when
Stratek's checklist is green: live key (`sk_live_`), payment notifications
registered, and **one real payment received at the till** with the PayBridgeNP
QR since the key was last saved (Display tab -> Kiosk checklist). Re-saving the
key or switching the toggle off/on means proving it again. Stratek asks the
connector's hidden `health` action (key works, live or test, notifications
still registered at PayBridgeNP). On a kiosk the QR always comes from
PayBridgeNP -- if it can't make one, the order is refused, never shown with the
shop's own QR -- and the smallest kiosk order is Rs 10.

On a sale's Details: **Check online payment** (manual look-up) and **Refund
online payment** (Khalti automatic, eSewa finished in the eSewa portal, Fonepay
refunds aren't supported by PayBridgeNP).

**Test keys:** put your sandbox project key (`sk_test_...`) in **Test keys** and
the live key (`sk_live_...`) in **Live keys**. Each registers its own payment
notifications. Fonepay has no sandbox -- test-mode payments are real money (max
Rs 1,000 each, Rs 5,000 a month) and are marked "Test-mode payment". The till
and kiosk always use the live key.

### Using Pathao (available)

1. Stratek admin enables Pathao for the shop (Availability, NPR).
2. Integrations -> Pathao -> **Set up**: the **API base URL**, Client ID and
   Client secret from Pathao Merchant -> Developer API (Merchant API
   Credentials), plus your Pathao merchant login email and password.
3. Press **Test Pathao**: it signs in, lists your Pathao stores with their
   IDs, and checks what the online store needs -- Pathao's city list and one
   sample delivery price ("live quotes work"). Put the right **Store ID** in
   Set up.
   **Test keys:** Pathao's sandbox API address and test credentials; press
   **Test Pathao (test keys)** to check them. Test bookings go to Pathao's
   sandbox -- no rider is sent.
4. **Send with Pathao** (red button) appears at the till right after **Charge
   total**, and on every sale's Details: recipient, phone, address, cash to
   collect, weight, note -> books the delivery. **Track Pathao delivery** (sale
   Details) shows its status.
5. For the online store (coming next), Stratek uses Pathao's own city -> zone
   -> area lists (cached for a day) and Pathao's price for each address, and
   books with that exact location.

### Using Stripe, PayPal and Coinbase (available)

All three work like PayBridgeNP: **Set up** the keys, press **Test ...** on the
Integrations tab, then after **Charge total** use **Pay by card (Stripe)**,
**Pay with PayPal** or **Pay with crypto (Coinbase)** under the QR -- a second QR
opens their payment page. On the sale: **Check ... payment** (then **Settle**) and
**Refund ... payment**.

- **Stripe:** live secret key (`sk_live_...`, or a restricted `rk_live_` key
  with Checkout Sessions + Refunds) in Live keys; `sk_test_...` in Test keys.
  Charges in the shop's currency.
- **PayPal:** client ID + secret from developer.paypal.com: the Live app in Live
  keys, the Sandbox app in Test keys (the old *Mode* field is gone). PayPal only accepts its own currency list (USD,
  EUR, GBP, AUD, ... -- not NPR); "Check" also captures an approved payment.
- **Coinbase:** a Coinbase Developer Platform API key created with the
  **Ed25519** signature algorithm (key ID + private key). Uses Coinbase
  Business checkouts; currencies are Coinbase's (e.g. USD, EUR, USDC), not NPR.
  Live only (no test environment).

### Using Slant 3D (available)

Set up the API key (`sl-...`; platform ID optional). On a sale: **Quote 3D print**
(model file URL, quantity, customer email and shipping address) uploads the
model and creates a **draft** order with its price -- nothing is charged. **Confirm
3D print order** pays for it from your Slant 3D account and sends it to
production; **Track 3D print** shows status and tracking. Live only (Slant 3D
has no test environment) -- quotes are free, confirming costs money.

### Using Meta (available)

- **Meta Conversions API:** dataset (pixel) ID + Conversions API token. Test
  keys = the same two plus the **test event code** (events then show only in
  Events Manager -> Test events). On a sale, **Send sale to Meta Ads** with the
  customer's email or phone (hashed before sending) reports a Purchase so ads get
  credit for in-store sales.
- **Meta Catalog:** catalogue ID + system user token (optional shop web address).
  **Sync menu to Facebook/Instagram Shop** on the Integrations tab sends every
  menu item that has a photo (Meta needs one); unavailable items show as out of
  stock. Stratek passes the menu along with the request. Test keys: the ID of a
  separate test catalogue.

These integrations follow each provider's published API and were tested
against stand-in services; please report anything that differs with a real
account (Pathao especially, and Slant 3D's address fields).

New integrations arrive with connector updates (**Update connector** in Stratek).

Next in Stratek: an **online store** per shop (`strateknepal.com/store/<shop>`,
see the POS repo's `docs/proposals/online-store.md`), gated on PayBridgeNP
(Fonepay QR on the order page, confirmed automatically) + Pathao (live quotes,
booking), with pickup or delivery and a test mode that uses the test keys.
To build one, see [docs/adding-an-integration.md](docs/adding-an-integration.md).

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

- **Keys** live only in the shop's Cloudflare account: saved by the Set up form
  in the connector's own storage (a Durable Object, encrypted at rest by
  Cloudflare), or as Cloudflare Secrets. They are never sent to Stratek and
  never shown again in full -- only masked (e.g. `sk_…4f2a`).
- **Only what the shop is allowed:** every pass lists the integrations
  Stratek's admins enabled for that shop (claim `int`); the connector hides and
  refuses all others.
- **Set up form:** served by the connector itself and opened from Stratek with
  a one-hour pass in the address `#fragment` (never sent to a server, removed
  from the address bar at once). Only someone signed in to Stratek can change
  keys -- passes made with an API key or by an AI agent can't. Stratek's pages
  can't call the key endpoints at all (no CORS).
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
  Disconnecting keeps the saved keys (they belong to the shop's account).

## For developers

- How Stratek and a connector talk: [CONNECTORS.md](CONNECTORS.md)
- Adding an integration: [docs/adding-an-integration.md](docs/adding-an-integration.md)
- Deploying from the command line (e.g. for many shops):
  `CLOUDFLARE_ACCOUNT_ID=<shop account id> npx wrangler deploy` (log in with
  `npx wrangler login`, which must have access to that account).
- Tests: `npm test` (Node 20+).
- Code map: `src/index.js` (routes), `src/registry.js` (catalogue, readiness,
  manifest), `src/integrations/*.js` (one file per integration, listed in
  `catalogue.js`), `src/pages.js` (status and Set up pages), `src/auth.js`
  (pass checks), `src/state.js` (Durable Object), `scripts/bundle.mjs`
  (builds `dist/connector.json`, which Stratek installs, and
  `dist/catalogue.json`, which Stratek's admin Availability table reads).
