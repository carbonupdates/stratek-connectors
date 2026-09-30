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

**v0.16.0 adds 38 more Coming-soon scaffolds** -- shipping (FedEx, UPS, Aramex,
Easyship, ShipStation, Shiprocket), fulfilment (Amazon Multi-Channel Fulfillment,
Amazon Supply Chain Services, ShipBob, Printful, Printify), PCB and manufacturing
(JLCPCB, PCBWay), suppliers & sourcing (Alibaba.com, AliExpress dropshipping,
CJdropshipping, Made-in-China.com), hotels & hospitality (Cloudbeds, Mews, Oracle
OPERA Cloud, SiteMinder, Booking.com, Expedia, Airbnb, OpenTable, Foodmandu),
payments (IME Pay, Prabhu Pay, WeChat Pay, Alipay+ direct, Paytm, Payoneer),
marketplaces (Amazon Seller, Etsy, eBay, TikTok Shop), Viber and Zoho Books.
Viber and Zoho Books were built in v0.17.0; the shipping and fulfilment ones (all but
Amazon Supply Chain Services, which has no public API yet) in v0.18.0.
**[docs/coming-soon.md](docs/coming-soon.md)** has the finished / remaining tally and every
scaffold by build wave, with who has to be approved (the business or Stratek). They are not in the table
below yet; each moves into it when it is built.

### AI agents and money (v0.9.0+)

Agents connected to Stratek (API keys, MCP) can run safe actions -- tests,
checks, tracking, Pathao quotes, menu sync. Actions that move money out of the
shop (refunds, **Send with Pathao**, confirming a 3D print) are marked
`outbound`: the connector refuses them to API keys, and the agent must ask in
Stratek, where a person approves each one. Incoming payments stay automatic.

### Live keys and test keys (v0.8.0+)

Every integration's **Set up** page has two sections: **Live keys** (real
customers, real money) and optional **Test keys**. Where each set is used is
fixed, not a switch you can forget:

- **Live keys:** the till, the kiosk, the live online store -- everything real.
- **Test keys:** only where Stratek says "test": the online store's test mode
  and the **"(test keys)"** buttons on Stratek's Integrations tab.

The Integrations tab shows two labels on every integration: **Live keys ✓ / not
set** and **Test keys ✓ / not set** (or **not offered (live only)** when the
provider has no test environment: Coinbase, Slant 3D). Test
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
| [Stripe](https://docs.stripe.com/api) | Test Stripe, Pay by card (Stripe), Check card payment, Refund card payment (needs a person) | Stripe secret key | Test keys | **Available** |
| [PayPal](https://developer.paypal.com/api/rest/) | Test PayPal, Pay with PayPal, Check PayPal payment, Refund PayPal payment (needs a person) | PayPal client ID, PayPal client secret | Test keys | **Available** |
| [Khalti](https://docs.khalti.com/khalti-epayment/) | Test Khalti, Pay with Khalti (QR, payment detected), Check Khalti payment, Refund Khalti payment (needs a person) | Khalti secret key | Sandbox (dev.khalti.com) | **Available** (v0.15.0) |
| [eSewa](https://developer.esewa.com.np/pages/Epay) | Test eSewa, Pay with eSewa (QR, payment detected), Check eSewa payment | eSewa merchant (product) code, eSewa secret key | UAT (EPAYTEST) | **Available** (v0.15.0) |
| [Fonepay dynamic QR](https://www.fonepay.com/) | Fonepay QR for this amount, Check Fonepay payment | Fonepay merchant code, Fonepay secret key, Fonepay API username (optional), Fonepay API password (optional) | -- | Coming soon |
| [connectIPS](https://doc.connectips.com/docs/connectIPS-Gateway/merchant-interface) | Test connectIPS, Pay with connectIPS (QR, payment detected), Check connectIPS payment | Merchant ID, App ID, App name, App password, Private key (PEM), connectIPS address (optional) | UAT (uat.connectips.com) | **Available** (v0.15.0) |
| [PayBridgeNP](https://docs.paybridgenp.com/api-reference/overview) | Till, kiosk & online store payment QR (auto-detects payment), Test PayBridgeNP, Check online payment, Refund online payment (needs a person) | PayBridgeNP secret key | Test keys (Fonepay = real money) | **Available** |
| [Razorpay (UPI)](https://razorpay.com/docs/api/payments/payment-links/) | Test Razorpay, Pay with UPI / card (Razorpay) (QR, payment detected by webhook or check), Check Razorpay payment, Refund Razorpay payment (needs a person) | Key ID, key secret (+ webhook secret) | Test keys (rzp_test_) | **Available** (v0.21.0, INR) |
| [Paytm](https://business.paytm.com/docs/api/create-link-api) | Test Paytm, Pay with Paytm / UPI (QR), Check Paytm payment | Paytm MID, merchant key | Staging MID/key | **Available** (v0.21.0, INR) |
| [Coinbase (crypto)](https://docs.cdp.coinbase.com/coinbase-business/) | Test Coinbase, Pay with crypto (Coinbase), Check crypto payment, Refund crypto payment (needs a person) | CDP API key ID / name, CDP API private key (Ed25519, base64) | Live only | **Available** |

### Delivery & rides

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| [Pathao](https://merchant.pathao.com/courier/developer-api) | Test Pathao, Send with Pathao (needs a person), Track Pathao delivery | Pathao API base URL, Client ID, Client secret, Pathao merchant login email, Pathao merchant password, Store ID (optional), Webhook secret (optional, delivery notifications) | Test keys | **Available** |
| [Yango Delivery](https://yango.com/) | Send with Yango, Track Yango delivery | Yango Delivery API token, Pickup address | -- | Coming soon |
| [Pick & Drop](https://pickndropnepal.com/) | Send with Pick & Drop | Pick & Drop API key | -- | Coming soon |
| inDrive | Send with inDrive | inDrive API key | -- | Coming soon |
| [DHL Express](https://developer.dhl.com/api-reference/dhl-express-mydhl-api) | Get DHL rate, Ship with DHL (needs a person; label PDF), Track DHL shipment | MyDHL API key + secret, DHL Express account number, shipper name/phone/address/city (+ postal code, country) | Test credentials | **Available** (v0.17.0) |
| [FedEx](https://developer.fedex.com/api/en-us/home.html) | Get FedEx rate, Ship with FedEx (needs a person; label PDF), Track FedEx shipment | FedEx API key + secret key, FedEx account number, shipper name/phone/address/city (+ state, postal code, country, service) | Test keys | **Available** (v0.18.0) |
| [UPS](https://developer.ups.com/) | Get UPS rate, Ship with UPS (needs a person; label image), Track UPS shipment | UPS client ID + secret, UPS account (shipper) number, shipper address (+ service code) | Test site (same keys) | **Available** (v0.18.0) |
| [Aramex](https://www.aramex.com/us/en/developers-solution-center) | Get Aramex rate, Ship with Aramex (needs a person; Aramex label link), Track Aramex shipment | API username + password, account number, PIN, entity (+ country), shipper address | Test credentials | **Available** (v0.18.0) |
| [Easyship](https://developers.easyship.com/) | Compare Easyship rates, Ship with Easyship (needs a person; buys the label), Track Easyship shipment | Easyship API token, shipper address (+ email, HS code) | Sandbox token | **Available** (v0.18.0) |
| [Shiprocket](https://apidocs.shiprocket.in/) | Check Shiprocket couriers, Ship with Shiprocket (needs a person; INR sales only), Track Shiprocket shipment | API user email + password, pickup location nickname, pickup PIN code | Live only | **Available** (v0.18.0) |

### Manufacturing & fulfilment

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| [Slant 3D](https://slant3dapi.com/documentation/introduction) | Test Slant 3D, Quote 3D print (Slant 3D), Confirm 3D print order (needs a person), Track 3D print | Slant 3D API key, Platform ID (optional) | Live only | **Available** |
| [ShipStation](https://www.shipstation.com/docs/api/) | Test ShipStation, Send order to ShipStation (free -- labels are bought in ShipStation), ShipStation tracking | API key + secret (+ store ID) | Live only | **Available** (v0.18.0) |
| [ShipBob](https://developer.shipbob.com/) | Test ShipBob, Fulfil with ShipBob (needs a person), ShipBob tracking | Personal Access Token (+ ship option, channel ID) | Sandbox token | **Available** (v0.18.0) |
| [Amazon Multi-Channel Fulfillment](https://developer-docs.amazon.com/sp-api/docs/fulfillment-outbound-api) | Preview Amazon fulfillment, Fulfil with Amazon (MCF) (needs a person), Track Amazon fulfillment | Login with Amazon client ID + secret, SP-API refresh token, marketplace ID (+ region) | SP-API sandbox | **Available** (v0.18.0) |
| [Printful](https://developers.printful.com/docs/) | Test Printful, Price Printful order, Confirm Printful order (needs a person), Track Printful order | Private token (+ store ID) | Live only (pricing is free) | **Available** (v0.20.0) |
| [Printify](https://developers.printify.com/) | Test Printify, Printify shipping price, Confirm Printify order (needs a person), Track Printify order | Personal access token, shop ID | Live only | **Available** (v0.20.0) |
| [CJdropshipping](https://developers.cjdropshipping.com/) | Test CJ, Find CJ products, Price CJ order (unpaid order), Confirm CJ order (needs a person; pays from CJ balance), Track CJ order | CJ API key (+ default shipping method, warehouse country) | Live only | **Available** (v0.20.0) |

### Hotels & hospitality

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| [Cloudbeds](https://developers.cloudbeds.com/) | Test Cloudbeds, Guests in house, Today's arrivals, Charge to room (needs a person) | Property API key, Property ID | Live only | **Available** (v0.19.0) |
| [Oracle OPERA Cloud](https://docs.oracle.com/en/industries/hospitality/integration-platform/) | Test OPERA Cloud, Charge to room (needs a person) | OHIP gateway URL, app key, client ID + secret, enterprise ID, hotel ID, outlet transaction code (+ cashier ID) | OHIP sandbox | **Available** (v0.19.0) |

### Messages & notifications

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| [WhatsApp Business](https://developers.facebook.com/docs/whatsapp/cloud-api) | Test WhatsApp, Send test message, Send receipt on WhatsApp (approved template) | Access token, Phone number ID, Receipt template name (+ language) | Live only (Meta test number) | **Available** (v0.17.0) |
| [Sparrow SMS](https://docs.sparrowsms.com/sms/documentation/) | Test Sparrow SMS (credits), Send test SMS, Send receipt by SMS | Sparrow SMS token, Sender identity (From) | Live only | **Available** (v0.14.0) |
| [Telegram](https://core.telegram.org/bots/api) | Owner alerts from Stratek, chat with the AI employee, Post sale to Telegram, Send test message | Telegram bot token | Live only | **Available** (v0.13.0) |
| [Viber](https://developers.viber.com/docs/api/rest-bot-api/) | Link my Viber, Send test message, Post sale to Viber | Viber bot token | Live only | **Available** (v0.17.0) |
| [Slack](https://api.slack.com/messaging/webhooks) | Test Slack, Post sale to Slack | Slack incoming webhook URL | Live only | **Available** (v0.14.0) |

### Accounting & tax

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| [Nepal IRD e-billing (CBMS)](https://ird.gov.np/content/9052/cbmsapitechnicaldocumentfor/) | Check IRD settings, Report bill to IRD, Report return to IRD | IRD CBMS username, IRD CBMS password, Seller PAN, CBMS address (optional) | Live only (test sales never sent) | **Available** (v0.15.0) |
| [QuickBooks Online](https://developer.intuit.com/app/developer/qbo/docs/get-started) | Connect QuickBooks (OAuth), Test QuickBooks, Send sale to QuickBooks (sales receipt) | Intuit app client ID + secret | Sandbox company | **Available** (v0.17.0) |
| [Xero](https://developer.xero.com/documentation/api/accounting/invoices) | Connect Xero (OAuth), Test Xero, Send sale to Xero (approved invoice) | Xero app client ID + secret (+ sales account, scopes) | Live only (Demo Company) | **Available** (v0.17.0) |
| [Google Sheets](https://developers.google.com/workspace/sheets/api/guides/concepts) | Test Google Sheets, Copy inventory to Google Sheet, Add sale to Google Sheet | Service account key (JSON), Sheet link or ID, Tab for sales (optional) | Live only | **Available** (v0.14.0) |
| [Zoho Books](https://www.zoho.com/books/api/v3/) | Connect Zoho Books (OAuth), Test Zoho Books, Send sale to Zoho Books (invoice) | Zoho client ID + secret (+ data centre, organization ID) | Live only | **Available** (v0.17.0) |

### Online stores & marketplaces

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| [Shopify](https://shopify.dev/docs/api/admin-rest) | Test Shopify, Sync inventory to Shopify, Latest Shopify orders | Store address (myshopify.com), Admin API access token | Live only (development store) | **Available** (v0.17.0) |
| [WooCommerce](https://woocommerce.github.io/woocommerce-rest-api-docs/) | Test WooCommerce, Sync inventory to WooCommerce, Latest WooCommerce orders | Store address (https), Consumer key, Consumer secret | Live only (staging store) | **Available** (v0.17.0) |
| [Daraz](https://open.daraz.com/) | Sync stock to Daraz | App key, App secret, Access token | -- | Coming soon |
| [Meta Catalog (Facebook & Instagram Shop)](https://developers.facebook.com/docs/marketing-api/catalog-batch/) | Test Meta Catalog, Sync menu to Facebook/Instagram Shop | Catalog ID, System user access token, Shop web address (optional), Graph API version (optional) | Test keys | **Available** |
| [eBay](https://developer.ebay.com/api-docs/sell/inventory/overview.html) | Test eBay, Sync inventory to eBay (details, stock, price with a factor), Latest eBay orders | App client ID + secret, seller refresh token (+ default stock, price factor) | Sandbox keys | **Available** (v0.21.0) |
| [Amazon Seller](https://developer-docs.amazon.com/sp-api/docs/listings-items-api-v2021-08-01-reference) | Test Amazon Seller, Sync stock to Amazon (price with a factor), Latest Amazon orders | LWA client ID + secret, refresh token, seller ID, marketplace ID (+ region, stock, price factor, currency) | SP-API sandbox | **Available** (v0.21.0) |

### Customers & marketing

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| [Mailchimp](https://mailchimp.com/developer/marketing/api/list-members/) | Test Mailchimp, Add customer to Mailchimp (double opt-in) | Mailchimp API key, Audience ID, New contacts are (optional) | Live only | **Available** (v0.14.0) |
| [HubSpot](https://developers.hubspot.com/docs/api/crm/contacts) | Test HubSpot, Add customer to HubSpot | Private app access token | Live only | **Available** (v0.14.0) |
| [Meta Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api) | Test Meta Conversions API, Send sale to Meta Ads | Pixel / dataset ID, Conversions API access token, Graph API version (optional) | Test keys | **Available** |

### Automation

| Integration | Buttons in Stratek | Keys (Set up form) | Test mode | Status |
|---|---|---|---|---|
| Webhook | Test webhook, Send inventory to webhook, Send sale to webhook | Webhook address (https://), Signing secret (optional) | Live only | **Available** (v0.14.0) |
| [Zapier](https://help.zapier.com/hc/en-us/articles/8496288690317) | Test Zapier, Send sale to Zapier | Zapier catch hook URL | Live only | **Available** (v0.14.0) |
| [Make](https://www.make.com/en/help/tools/webhooks) | Test Make, Send sale to Make | Make webhook URL | Live only | **Available** (v0.14.0) |

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

**Test first:** switch Stratek to **Test** (Display tab -> Shop mode). The till
QR and kiosk then use the **Test keys** (checklist: test key + test
notifications), every sale is a test sale kept out of the books, and screens
show TEST MODE. Switch back to **Live** there when done.

**Kiosk mode (Live) needs this.** A kiosk (self-service screen) in Live only works when
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
   Set up -- just the number (e.g. `130903`); Test Pathao says "Using store ID
   ..." or tells you if it doesn't match your stores.
   **Test keys:** Pathao's sandbox API address and test credentials; press
   **Test Pathao (test keys)** to check them. Test bookings go to Pathao's
   sandbox -- no rider is sent.
4. **Send with Pathao** (red button) appears at the till right after **Charge
   total**, and on every sale's Details: recipient, phone, address, cash to
   collect, weight, note -> books the delivery. **Track Pathao delivery** (sale
   Details) shows its status.
5. For the online store, Stratek uses Pathao's own city -> zone -> area lists
   (cached for a day) and Pathao's price for each address, and books with that
   exact location.
6. **Delivery notifications (v0.10.0+):** make up a long random **Webhook
   secret** and save it in Set up (Live keys and/or Test keys). The Set up page
   shows the **callback URL** (`<connector>/webhooks/pathao`, or
   `.../webhooks/pathao/test` for sandbox keys). In Pathao Merchant ->
   Developer API -> Webhook, paste that URL and the same secret. Pathao checks
   it (we answer `202` with Pathao's integration header). From then on every
   status change -- picked up, in transit, delivered, returned, failed -- goes
   to Stratek as a signed `delivery.status` event: the online order moves to
   **Out for delivery** and, once delivered and the payment is settled,
   **Completed**. Returns and failures are flagged for a person. Nothing moves
   money. Only deliveries this connector booked (same consignment) are passed on.

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

Built in Stratek: an **online store** per shop (`strateknepal.com/store/<shop>`,
see the POS repo's `docs/proposals/online-store.md`), gated on PayBridgeNP
(Fonepay QR on the order page, confirmed automatically) + Pathao (live quotes,
booking), with pickup or delivery and a test mode that uses the test keys.
To build one, see [docs/adding-an-integration.md](docs/adding-an-integration.md).

## Wave 7: Indian payments and marketplaces (v0.21.0+)

- **Razorpay and Paytm** (INR shops): under the payment QR, "Pay with ..." shows a
  QR of a payment link (UPI, cards, netbanking / Paytm wallet). Razorpay tells the
  connector by a signed webhook (add it in Razorpay with the secret; the Set up page
  shows the URL) and "Check" asks Razorpay / Paytm directly; either way the sale is
  marked **Paid online** once and a person still presses **Settle**. Razorpay
  refunds need a person. Paytm requests are signed with Paytm's checksum.
- **eBay and Amazon Seller:** "Sync" pushes new and changed Stratek items (20 per
  press) by SKU. eBay: title, description, photo and stock go to eBay inventory
  items (publish each once in Seller Hub); Amazon: stock of listings that already
  exist. Prices change only if you set a **price factor** (Stratek price x factor,
  e.g. NPR -> USD), because the marketplace currency differs from the shop's.
  "Latest orders" shows the last five.
- IME Pay and Prabhu Pay (API only for contracted merchants), WeChat Pay and
  Alipay+ (acquirer), Etsy and Daraz (app approval), Payoneer and TikTok Shop
  (Stratek partner) stay Coming soon.

## Wave 6: print-on-demand and dropshipping (v0.20.0+)

- **Printful, Printify, CJdropshipping** make and ship a sale's items straight to
  the customer. Products go by **SKU** -- set your Stratek item SKUs as the
  Printful variant External ID / Printify variant SKU / CJ variant SKU, or type
  them on the button ("TEE-M x2"; Printful also takes its numeric variant IDs).
- "Price ..." is free and anyone allowed can press it (Printful estimate, Printify
  shipping price; for CJ it creates an **unpaid** CJ order and shows the total).
  "Confirm ..." creates the paid order, so it **needs a person**; one order per
  sale -- pressing again shows the one already made. CJ's confirm pays the order
  it already priced from your CJ balance.
- "Find CJ products" searches CJ's catalogue by name and shows each SKU and price.
- JLCPCB, PCBWay, AliExpress and Alibaba need the business's API application
  approved first; Made-in-China needs a partner deal. They stay Coming soon.

## Wave 5: hotels -- charge to room (v0.19.0+)

- For a restaurant, bar, spa or shop inside a hotel: on a sale, **Charge to room**
  puts it on the guest's hotel bill. It bills a guest, so it **needs a person**
  (AI agents and API keys get an approval request). One charge per sale; pressing
  again shows the one already made. The guest pays the hotel at check-out, and a
  person settles the Stratek sale as usual -- nothing settles by itself.
- **Cloudbeds:** type the room number or the guest's name (only checked-in guests
  match; two matches -> use the room). Each sale item becomes a line on the bill,
  plus one line for VAT / service / rounding so the total matches Stratek's bill.
  "Guests in house" and "Today's arrivals" help at the counter. No test mode.
- **OPERA Cloud:** needs the hotel's own OHIP access (OHIP developer portal: an
  application with Cashiering + Reservations, an integration user / cashier and a
  transaction code for this outlet). Posts one charge with the sale total; the
  item list goes in the posting remark. Try it on the OHIP sandbox (Test keys).
- Mews, OpenTable, SiteMinder, Booking.com, Expedia and Airbnb only open to
  certified software partners, so they wait until Stratek applies; Foodmandu has
  no public API.

## Wave 4: shipping and fulfilment (v0.18.0+)

- **Carriers -- FedEx, UPS, Aramex, Easyship, Shiprocket (and DHL):** on a sale,
  "Get rate" asks the carrier for prices; "Ship with ..." books a paid shipment,
  so it **needs a person** (AI agents and API keys only get an approval request);
  "Track" shows the latest scan. Your pickup address is set once in Set up. The
  delivery form fills the name, phone and email from an online-store order. One
  shipment per sale: pressing again shows the one already booked. Labels open
  from a link (FedEx / UPS / Easyship labels are kept on this connector at
  `/pay/<integration>/start/<mode>/<token>`; Aramex and Shiprocket host their own).
  International FedEx shipments send a commercial-invoice line per sale item.
- **Try them in test mode first:** FedEx, UPS, Aramex, Easyship have test
  credentials / sandboxes (nothing is collected or charged). Shiprocket has no
  test mode and ships INR sales only.
- **Warehouses -- ShipStation, ShipBob, Amazon Multi-Channel Fulfillment:**
  products go by **SKU**: the sale items' SKUs, or type them on the button
  ("MUG-01 x2, TEE-M x1"). "Send order to ShipStation" costs nothing (labels
  are bought in ShipStation), so anyone allowed can press it; ShipBob and Amazon
  charge for fulfilment, so those need a person. "Preview Amazon fulfillment"
  shows the fees and arrival date per speed first.
- **Amazon Supply Chain Services** stays Coming soon: Amazon has no public
  self-serve API for it yet (Sept 2026).

## Wave 3: WhatsApp, Viber, stores and accounting, DHL (v0.17.0+)

- **WhatsApp Business:** receipts use a message template Meta has approved
  (Utility, 3 variables: shop, receipt number, amount). "Send test message" uses
  Meta's built-in `hello_world`. Nepali 10-digit numbers get 977 added.
- **Viber:** your own bot; saving the token registers `/webhooks/viber` (signed
  events). "Link my Viber" opens the bot with a one-time code; send it any message
  to finish. Sale updates go to you (customers must message a bot first).
- **WooCommerce / Shopify:** "Sync inventory" pushes new and changed items (20 per
  press, press again for more; the item link is remembered), and "Latest orders"
  shows the last five. WooCommerce needs https and a Read/Write REST key; Shopify
  a custom app token with `write_products` and `read_orders`.
- **QuickBooks, Xero, Zoho Books -- bring your own app + Connect:** create an app
  with the provider, paste its client ID / secret, add the redirect URI
  `<connector>/oauth/<integration>/callback` (the Connect button shows it), then
  press **Connect ...** and log in. Tokens stay in this connector and refresh by
  themselves. "Send sale" books the sale once (QuickBooks sales receipt on a
  "Stratek sale" item, Xero approved invoice on account 200, Zoho invoice), with a
  line for VAT / service / discount so totals match the Stratek bill.
- **DHL Express:** rates, "Ship with DHL" (books a paid shipment, so it needs a
  person; the label PDF opens from a link on this connector) and tracking. Use
  DHL's test credentials first.

## Nepal payments and tax (v0.15.0+)

**Khalti, eSewa, connectIPS** work like the card buttons: under the payment QR,
"Pay with ..." shows a QR the customer scans. Khalti opens Khalti's own payment
page; eSewa and connectIPS open a short page on this connector
(`/pay/<integration>/start/<mode>/<token>`) that posts the signed form to the
gateway. The gateway sends the customer back to `/pay/<integration>/return/<mode>`;
the connector **checks the payment with the gateway** (Khalti lookup, eSewa
signature + status API, connectIPS validatetxn) and only then sends Stratek a
signed `payment.succeeded` event -- the sale shows **Paid online** and a person
still presses **Settle**. "Check ... payment" on the sale does the same check by
hand. Khalti refunds need a person (approval request for AI agents).

- **Khalti:** secret key from admin.khalti.com (Live) / test-admin.khalti.com (Test).
- **eSewa:** merchant (product) code + ePay v2 secret key. Test: EPAYTEST with the
  UAT secret from eSewa's developer docs. Refunds: eSewa merchant portal.
- **connectIPS:** merchant ID, app ID/name, app password, and the private key from
  your CREDITOR.pfx (`openssl pkcs12 -in CREDITOR.pfx -nocerts -nodes`; PKCS#1 or
  PKCS#8 PEM). Give NCHL `<connector>/pay/connectips/return/live` (and `/test` for
  UAT) as the success and failure URL -- "Test connectIPS" shows it.
- **Nepal IRD e-billing (CBMS):** "Report bill to IRD" sends the sale to
  `cbapi.ird.gov.np/api/bill` with the date in Bikram Sambat (YYYY.MM.DD) and the
  fiscal year (e.g. 2083.084, from Shrawan 1); "Report return to IRD" sends a
  credit note. Amounts come from the Stratek bill (taxable, VAT, exempt). Each
  sale is reported once; test-mode sales never. **CBMS is meant for tax invoices
  from IRD-approved billing software, and Stratek's bill says "not a tax
  invoice" -- check with IRD or your accountant before using it.** The BS calendar
  table (2070-2099) is in `src/integrations/_nepal.js`.

## Sending sales elsewhere (v0.14.0+)

**Webhook, Zapier, Make** send the same JSON when someone presses the button on a
sale (or "Send inventory to webhook" on the Integrations tab):

```json
{ "type": "sale", "sentAt": "...", "mode": "live", "shop": "Chyau",
  "sale": { "id": "42", "amount": 610, "currency": "NPR", "reference": "Online order #12",
            "items": [{ "name": "Oyster pack", "price": 250, "qty": 2 }], "bill": null, "createdAt": "..." },
  "customer": { "name": "Sita Sharma", "email": "...", "phone": "..." } }
```

`customer` is only there for online-store orders. With a **signing secret**, the
Webhook adds `X-Stratek-Signature: t=<unix>,v1=<hex HMAC-SHA256 of "<t>.<body>">`
-- check it and reject old timestamps. Zapier and Make addresses are checked to be
on zapier.com / make.com. **Slack** posts a one-line sale summary. **Sparrow SMS**
sends a short receipt to a Nepali mobile number (switch off IP whitelisting in
Sparrow). **Google Sheets** uses a service account (share the sheet with its
email): "Add sale" appends a row to the "Sales" tab (made for you), "Copy
inventory" rewrites an "Inventory" tab. **Mailchimp** adds the customer as
*pending* (they confirm by email) unless you set "New contacts are" to
`subscribed`; **HubSpot** creates or updates the contact. For online-store
orders Stratek fills in the customer's email, name and phone.

## Telegram (v0.13.0+)

Stratek alerts on the owner's Telegram (approval requests, paid online orders,
delivery problems, daily summary) and chat with the AI employee there.
Make a bot with **@BotFather** (`/newbot`) and paste its token in Set up --
saving registers this connector with Telegram (`setWebhook` to
`/webhooks/telegram` with a random secret that Telegram sends back in
`X-Telegram-Bot-Api-Secret-Token`). Then press **Link my Telegram** in
Stratek: a one-time `t.me/<bot>?start=<code>` link (15 minutes, private chat
only) links that one Telegram account; every other chat is ignored. Stratek
decides when an alert is due and asks the connector to send it; the token
never leaves the connector. Approvals stay in the Stratek dashboard -- alerts
only link there.

## AI employee (v0.12.0+)

An AI staff member that runs **in this connector** with **your own AI key**
(Anthropic / OpenAI / Gemini / any OpenAI-compatible model). Set up keys on its
row in Stratek's Integrations tab (provider, key, model, optional base URL and
daily token limit), press **Switch on** on its card, and give it tasks there.
Stratek gives the connector a limited identity for it (`POST /agent-key`, pass
only) and it uses Stratek's MCP tools with that identity -- so it follows every
Stratek rule for agents: no cash, no settling, money actions wait for a person.
The key and the conversation stay in this connector. Long jobs stop at a
free-plan-safe size and continue when asked; a daily token limit caps the bill.
Stratek's own API & MCP keys are separate and unchanged.

## The online store on your own address (v0.11.0+)

Your connector can also serve your Stratek online store from **your own
Cloudflare**: a free address `https://<your connector>.workers.dev/shop`, or
your own domain (e.g. `https://shop.yourbusiness.com`). Everything is done on
Stratek's Display tab -> Online store -> **Your own web address** (a tick for the
free address; for a domain: domain in your Cloudflare, **Create token**, paste,
pick the name). The connector shows Stratek's store page with a small config and
forwards only the store's own API to Stratek, signed with its event key (so
Stratek can trust the customer IP and address). Menu, orders and payments stay
in Stratek. On your own domain nothing else of the connector is reachable
(Set up pages, webhooks and pairing stay on the workers.dev address).

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
