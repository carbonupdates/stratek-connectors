# Integrations: finished, remaining and build waves

**Tally (connector 0.26.0): 68 built, 72 coming soon, 140 in total** (the Connector itself not counted).

Coming-soon ones are already in the catalogue as scaffolds (key fields and buttons drafted, `run` not built). To build one: follow `docs/adding-an-integration.md`, write each action, set `status: 'available'`, add a test, bump the version. Buttons only -- nothing runs by itself. Anything that spends money (labels, fulfilment, PCB and dropship orders, refunds) needs a person (AI agents can only ask).

## What "approval" means

| Kind | Who | Meaning |
|---|---|---|
| **Merchant account** | the business | Anyone can sign up and get API keys; the business pastes them in Set up. (49 remaining -- wave 10) |
| **Merchant approval** | the business | The provider has to accept the business first (merchant agreement, KYC, API application, seller account). Stratek can build and test these once one test account exists. (10 remaining) |
| **Stratek partner approval** | Stratek | The provider only works with certified software partners, so **Stratek** (the software maker) must apply once; after that every business can use it with its own login. (8 remaining) |
| **Partner deal (to confirm)** / No public API | -- | No public API yet; needs a conversation with the company first. (5 remaining) |

Setting up the connector itself never needs anyone's approval.

## Finished

- **Before the waves:** AI employee, PayBridgeNP, Stripe, PayPal, Coinbase, Pathao, Slant 3D, Meta Catalog, Meta Conversions API, Telegram
- **Wave 1 (0.14.0):** Webhook, Zapier, Make, Slack, Sparrow SMS, Google Sheets, Mailchimp, HubSpot
- **Wave 2 (0.15.0):** Khalti, eSewa, connectIPS, Nepal IRD e-billing (CBMS)
- **Wave 3 (0.17.0):** WhatsApp Business, Viber, WooCommerce, Shopify, QuickBooks Online, Xero, Zoho Books, DHL Express
- **Wave 4 (0.18.0):** FedEx, UPS, Aramex, Easyship, ShipStation, ShipBob, Amazon Multi-Channel Fulfillment, Shiprocket
- **Wave 5 (0.19.0):** Cloudbeds, Oracle OPERA Cloud (charge to room)
- **Wave 6 (0.20.0):** Printful, Printify, CJdropshipping
- **Wave 7 (0.21.0):** Razorpay (UPI), Paytm, eBay, Amazon Seller
- **Wave 8 (0.22.0):** Fonepay dynamic QR (direct), Yango Delivery
- **Subscription management (0.24.0):** Foneloan -- Buy Now Pay Later QR at the till & kiosk from Rs 15,000 (bring your own Foneloan QR; the shop must be a Foneloan partner)
- **Wave 9 (0.23.0):** Square, Mollie, Shippo, EasyPost, Gelato, Beds24, Twilio, Resend, ERPNext, Odoo, BigCommerce, Wix Stores, Google Analytics 4, TikTok Events API, n8n (all self-serve keys)

## Remaining (72)

### Wave 10 -- self-serve, buildable now (49)

Each of these gives a business its own API key (or webhook URL) without any app review, so
Stratek can build them without outside approval. Payment ones still need the business's own
account verification with the provider (like Stripe) before taking live money.

| Integration | Category | What it would do | Approval |
|---|---|---|---|
| [Braintree](https://developer.paypal.com/braintree/docs) | Payments | Cards and PayPal through Braintree (PayPal company). | Merchant account |
| [Mercado Pago](https://www.mercadopago.com/developers) | Payments | Latin America: payment links and QR through Mercado Pago. | Merchant account |
| [Flutterwave](https://developer.flutterwave.com/) | Payments | Africa: cards, mobile money and bank transfer links through Flutterwave. | Merchant account |
| [Paystack](https://paystack.com/docs/api/) | Payments | Africa: cards, bank and mobile money payments through Paystack. | Merchant account |
| [Xendit](https://docs.xendit.co/) | Payments | Southeast Asia: QR (QRIS, PromptPay...), e-wallets and virtual accounts through Xendit. | Merchant account |
| [Midtrans](https://docs.midtrans.com/) | Payments | Indonesia: QRIS, GoPay, cards and bank transfer through Midtrans. | Merchant account |
| [NOWPayments](https://documenter.getpostman.com/view/7907941/2s93JusNJt) | Payments | Crypto checkout in 300+ coins through NOWPayments. | Merchant account |
| [BTCPay Server](https://docs.btcpayserver.org/API/Greenfield/v1/) | Payments | Bitcoin payments through your own BTCPay Server (no middleman). | Merchant account |
| [ShipEngine](https://www.shipengine.com/docs/) | Delivery, shipping & rides | Rates, labels and tracking across many carriers through ShipEngine. | Merchant account |
| [Sendcloud](https://api.sendcloud.dev/) | Delivery, shipping & rides | Europe: shipping labels, returns and tracking through Sendcloud. | Merchant account |
| [AfterShip Tracking](https://www.aftership.com/docs/tracking) | Delivery, shipping & rides | Track any parcel from 1,000+ carriers in one place. | Merchant account |
| [17TRACK](https://api.17track.net/en/doc) | Delivery, shipping & rides | Track any parcel worldwide with 17TRACK. | Merchant account |
| [Prodigi](https://www.prodigi.com/print-api/docs/) | Manufacturing & fulfilment | Print-on-demand art prints, canvas and photo products through Prodigi. | Merchant account |
| [Lulu Print API](https://api.lulu.com/docs/) | Manufacturing & fulfilment | Print and ship books and booklets on demand through Lulu. | Merchant account |
| [BigBuy](https://api.bigbuy.eu/rest/doc) | Suppliers & sourcing | European dropship wholesaler: catalogue, orders and tracking through BigBuy. | Merchant account |
| [Lodgify](https://docs.lodgify.com/) | Hotels & hospitality | Holiday rentals: bookings and charges in Lodgify. | Merchant account |
| [Hostaway](https://api.hostaway.com/documentation) | Hotels & hospitality | Holiday rentals: reservations and extra charges in Hostaway. | Merchant account |
| [Guesty](https://open-api-docs.guesty.com/) | Hotels & hospitality | Rental operators: reservations and charges in Guesty. | Merchant account |
| [Smoobu](https://docs.smoobu.com/) | Hotels & hospitality | Holiday rentals: reservations and extras in Smoobu. | Merchant account |
| [Postmark](https://postmarkapp.com/developer) | Messages & notifications | Email receipts to customers through Postmark. | Merchant account |
| [Vonage SMS](https://developer.vonage.com/en/messaging/sms/overview) | Messages & notifications | SMS receipts worldwide through Vonage. | Merchant account |
| [Bird (MessageBird)](https://docs.bird.com/api) | Messages & notifications | SMS and WhatsApp receipts through Bird. | Merchant account |
| [Discord](https://discord.com/developers/docs/resources/webhook) | Messages & notifications | Sale and staff alerts to a Discord channel. | Merchant account |
| [Microsoft Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook) | Messages & notifications | Sale and staff alerts to a Teams channel. | Merchant account |
| [Google Chat](https://developers.google.com/workspace/chat/quickstart/webhooks) | Messages & notifications | Sale and staff alerts to a Google Chat space. | Merchant account |
| [LINE](https://developers.line.biz/en/docs/messaging-api/) | Messages & notifications | Owner alerts and customer receipts on LINE (Japan, Thailand, Taiwan). | Merchant account |
| [Pushover](https://pushover.net/api) | Messages & notifications | Push alerts to the owner's phone. | Merchant account |
| [ntfy](https://docs.ntfy.sh/publish/) | Messages & notifications | Free push alerts to the owner's phone (ntfy.sh or your own server). | Merchant account |
| [FreshBooks](https://www.freshbooks.com/api/start) | Accounting & tax | Send sales to FreshBooks as invoices. | Merchant account |
| [Airtable](https://airtable.com/developers/web/api/introduction) | Accounting & tax | Log each sale as a row in an Airtable base you own. | Merchant account |
| [Notion](https://developers.notion.com/) | Accounting & tax | Log each sale in a Notion database. | Merchant account |
| [Akaunting](https://akaunting.com/hc/docs/developers/api) | Accounting & tax | Send sales to Akaunting (free accounting app). | Merchant account |
| [Manager.io](https://www.manager.io/api) | Accounting & tax | Send sales to Manager.io (Cloud or Server edition). | Merchant account |
| [Squarespace Commerce](https://developers.squarespace.com/commerce-apis/overview) | Online stores & marketplaces | Keep Squarespace stock in step with Stratek, and see the latest orders. | Merchant account |
| [Ecwid by Lightspeed](https://api-docs.ecwid.com/) | Online stores & marketplaces | Keep an Ecwid store in step with Stratek, and see the latest orders. | Merchant account |
| [Magento / Adobe Commerce](https://developer.adobe.com/commerce/webapi/rest/) | Online stores & marketplaces | Keep a Magento store in step with Stratek, and see the latest orders. | Merchant account |
| [PrestaShop](https://devdocs.prestashop-project.org/8/webservice/) | Online stores & marketplaces | Keep a PrestaShop store in step with Stratek, and see the latest orders. | Merchant account |
| [OpenCart](https://docs.opencart.com/) | Online stores & marketplaces | Keep an OpenCart store in step with Stratek, and see the latest orders. | Merchant account |
| [Google Merchant Center](https://developers.google.com/merchant/api) | Online stores & marketplaces | Show your products on Google Shopping (free listings). | Merchant account |
| [Gumroad](https://gumroad.com/api) | Online stores & marketplaces | Digital products: see Gumroad sales next to Stratek. | Merchant account |
| [Klaviyo](https://developers.klaviyo.com/) | Customers & marketing | Add customers to Klaviyo and send sale events for your email / SMS flows. | Merchant account |
| [Brevo](https://developers.brevo.com/) | Customers & marketing | Add customers to Brevo lists and send email receipts. | Merchant account |
| [MailerLite](https://developers.mailerlite.com/) | Customers & marketing | Add customers to MailerLite groups. | Merchant account |
| [ActiveCampaign](https://developers.activecampaign.com/) | Customers & marketing | Add customers to ActiveCampaign lists. | Merchant account |
| [Pipedrive](https://developers.pipedrive.com/docs/api/v1) | Customers & marketing | Add customers and deals to Pipedrive. | Merchant account |
| [Zoho CRM](https://www.zoho.com/crm/developer/docs/api/v7/) | Customers & marketing | Add customers to Zoho CRM. | Merchant account |
| [Pipedream](https://pipedream.com/docs/workflows/building-workflows/triggers/) | Automation | Send sales to Pipedream workflows. | Merchant account |
| [IFTTT](https://ifttt.com/maker_webhooks) | Automation | Send sales to IFTTT applets (Webhooks service). | Merchant account |
| [Microsoft Power Automate](https://learn.microsoft.com/en-us/power-automate/) | Automation | Send sales to Power Automate flows (Microsoft 365). | Merchant account |

### Wave 5 -- hotels & hospitality (rest: need Stratek partner approval or an API)

Cloudbeds and OPERA Cloud are built. The ones below only open to certified software partners (Stratek applies once) or have no public API.

| Integration | What it does | API | Approval |
|---|---|---|---|
| Mews | Charge to room, guests in house | Connector API; integration certification | Stratek partner approval |
| OpenTable | Table bookings | Partner API | Stratek partner approval |
| SiteMinder | Room availability / channel manager | Partner programme | Stratek partner approval |
| Booking.com | Reservations | Connectivity Partner Programme | Stratek partner approval |
| Expedia Group | Reservations | Lodging connectivity partner | Stratek partner approval |
| Airbnb | Bookings | Approved software partners only | Stratek partner approval |
| Foodmandu | Food-delivery orders (Nepal) | No public API | Partner deal (to confirm) |

### Wave 6 -- manufacturing, print-on-demand & sourcing (rest: need an approved app)

Printful, Printify and CJdropshipping are built. The ones below need the business's API application approved first (JLCPCB, PCBWay, AliExpress, Alibaba) or a partner deal (Made-in-China); each gets built once one approved test account exists.

| Integration | What it does | API | Approval |
|---|---|---|---|
| JLCPCB | Quote/order PCB, SMT, 3D | API platform -- apply with your JLCPCB account | Merchant approval |
| PCBWay | Quote/order PCB | Partner API -- apply with your PCBWay account | Merchant approval |
| AliExpress dropshipping | Import products, dropship orders | Open Platform app (approval) | Merchant approval |
| Alibaba.com | Supplier search, orders | Open Platform app (approval) | Merchant approval |
| Made-in-China.com | Supplier search | Partner access to confirm | Partner deal (to confirm) |

### Wave 7 -- more payments & marketplaces (rest: need approval or a partner programme)

Razorpay, Paytm, eBay and Amazon Seller are built. IME Pay and Prabhu Pay share their API only with contracted merchants; WeChat Pay and Alipay+ need an acquirer; Etsy and Daraz need the app approved (Etsy also needs a Connect login with PKCE, planned in the OAuth helper); Payoneer and TikTok Shop need Stratek as a partner.

| Integration | What it does | API | Approval |
|---|---|---|---|
| IME Pay | Wallet checkout (Nepal) | Merchant e-payment API | Merchant approval |
| Prabhu Pay | Wallet checkout (Nepal) | Merchant API | Merchant approval |
| Payoneer | Payment requests | API partner programme | Stratek partner approval |
| WeChat Pay | Visitors from China | Cross-border merchant account through an acquirer | Merchant approval |
| Alipay+ (direct) | Visitors (Fonepay QRs already take Alipay+) | Acquiring partner onboarding | Merchant approval |
| Etsy | Listings and orders | Open API v3 (app key approval) | Merchant approval |
| TikTok Shop | Products and orders | Partner Center app | Stratek partner approval |
| Daraz | Products and orders | Open Platform app (approval) | Merchant approval |

### Wave 8 -- no public API (rest)

Fonepay dynamic QR (direct, with your own Fonepay API agreement) and Yango Delivery are built. These three have no public API to build against; they stay listed until the company offers one.

| Integration | What it does | API | Approval |
|---|---|---|---|
| Pick & Drop | Courier (Nepal) | No public API found | Partner deal (to confirm) |
| inDrive | Courier / rides | No public delivery API | No public API |
| Amazon Supply Chain Services | Freight, storage, distribution | Opened to all businesses May 2026, but no public self-serve API yet (checked Sept 2026) -- Amazon onboards through its sales team | Partner deal (to confirm) |

Sources: [Amazon Supply Chain Services (May 2026)](https://press.aboutamazon.com/2026/5/amazon-launches-amazon-supply-chain-services-opening-its-logistics-network-to-all-businesses), [SP-API Fulfillment Outbound](https://developer-docs.amazon.com/sp-api/docs/fulfillment-outbound-api), [JLCPCB API platform](https://api.jlcpcb.com/), [PCBWay partner API](https://api-partner.pcbway.com/), [Cloudbeds API](https://www.cloudbeds.com/api/), [Mews API](https://www.mews.com/en/products/api).
