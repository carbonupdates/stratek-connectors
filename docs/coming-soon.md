# Integrations: finished, remaining and build waves

**Tally (connector 0.17.0): 30 built, 42 coming soon, 72 in total** (the Connector itself not counted).

Coming-soon ones are already in the catalogue as scaffolds (key fields and buttons drafted, `run` not built). To build one: follow `docs/adding-an-integration.md`, write each action, set `status: 'available'`, add a test, bump the version. Buttons only -- nothing runs by itself. Anything that spends money (labels, fulfilment, PCB and dropship orders, refunds) needs a person (AI agents can only ask).

## What "approval" means

| Kind | Who | Meaning |
|---|---|---|
| **Merchant account** | the business | Anyone can sign up and get API keys; the business pastes them in Set up. (16 remaining) |
| **Merchant approval** | the business | The provider has to accept the business first (merchant agreement, KYC, API application, seller account). Stratek can build and test these once one test account exists. (14 remaining) |
| **Stratek partner approval** | Stratek | The provider only works with certified software partners, so **Stratek** (the software maker) must apply once; after that every business can use it with its own login. (8 remaining) |
| **Partner deal (to confirm)** / No public API | -- | No public API yet; needs a conversation with the company first. (4 remaining) |

Setting up the connector itself never needs anyone's approval.

## Finished

- **Before the waves:** AI employee, PayBridgeNP, Stripe, PayPal, Coinbase, Pathao, Slant 3D, Meta Catalog, Meta Conversions API, Telegram
- **Wave 1 (0.14.0):** Webhook, Zapier, Make, Slack, Sparrow SMS, Google Sheets, Mailchimp, HubSpot
- **Wave 2 (0.15.0):** Khalti, eSewa, connectIPS, Nepal IRD e-billing (CBMS)
- **Wave 3 (0.17.0):** WhatsApp Business, Viber, WooCommerce, Shopify, QuickBooks Online, Xero, Zoho Books, DHL Express

## Remaining (42)

### Wave 4 -- shipping & fulfilment

| Integration | What it does | API | Approval |
|---|---|---|---|
| FedEx | Rates, labels, tracking | Open developer portal (OAuth) | Merchant account |
| UPS | Rates, labels, tracking | Open developer portal (OAuth) | Merchant account |
| Aramex | Rates, shipments, tracking | Web services; credentials from your Aramex account manager | Merchant account |
| Easyship | Compare couriers, labels, tracking | Open REST API (token) | Merchant account |
| ShipStation | Send orders, track | Open REST API (key/secret) | Merchant account |
| ShipBob | Fulfil orders from ShipBob warehouses | Open REST API (token) | Merchant account |
| Amazon Multi-Channel Fulfillment | Fulfil from your FBA stock | SP-API Fulfillment Outbound; your own private SP-API app | Merchant approval |
| Amazon Supply Chain Services | Freight, storage, distribution | Opened to all businesses May 2026; API details to confirm | Merchant account |
| Shiprocket | India shipping (INR shops) | Open REST API (API user) | Merchant account |

### Wave 5 -- hotels & hospitality

| Integration | What it does | API | Approval |
|---|---|---|---|
| Cloudbeds | Charge to room, arrivals | REST API (property API key) | Merchant account |
| Oracle OPERA Cloud | Charge to room | OHIP (hotel's own OHIP subscription, or Stratek as partner) | Merchant approval |
| Mews | Charge to room, guests in house | Connector API; integration certification | Stratek partner approval |
| OpenTable | Table bookings | Partner API | Stratek partner approval |
| SiteMinder | Room availability / channel manager | Partner programme | Stratek partner approval |
| Booking.com | Reservations | Connectivity Partner Programme | Stratek partner approval |
| Expedia Group | Reservations | Lodging connectivity partner | Stratek partner approval |
| Airbnb | Bookings | Approved software partners only | Stratek partner approval |
| Foodmandu | Food-delivery orders (Nepal) | No public API | Partner deal (to confirm) |

### Wave 6 -- manufacturing, print-on-demand & sourcing

| Integration | What it does | API | Approval |
|---|---|---|---|
| Printful | Print-on-demand orders | Open REST API (token) | Merchant account |
| Printify | Print-on-demand orders | Open REST API (token) | Merchant account |
| CJdropshipping | Import products, dropship orders | Open API (key) | Merchant account |
| JLCPCB | Quote/order PCB, SMT, 3D | API platform -- apply with your JLCPCB account | Merchant approval |
| PCBWay | Quote/order PCB | Partner API -- apply with your PCBWay account | Merchant approval |
| AliExpress dropshipping | Import products, dropship orders | Open Platform app (approval) | Merchant approval |
| Alibaba.com | Supplier search, orders | Open Platform app (approval) | Merchant approval |
| Made-in-China.com | Supplier search | Partner access to confirm | Partner deal (to confirm) |

### Wave 7 -- more payments & marketplaces

| Integration | What it does | API | Approval |
|---|---|---|---|
| IME Pay | Wallet checkout (Nepal) | Merchant e-payment API | Merchant approval |
| Prabhu Pay | Wallet checkout (Nepal) | Merchant API | Merchant approval |
| Razorpay (UPI) | Cards/UPI (INR shops) | Open API (KYC account) | Merchant account |
| Paytm | Paytm/UPI (INR shops) | Payment Gateway API (KYC account) | Merchant account |
| Payoneer | Payment requests | API partner programme | Stratek partner approval |
| WeChat Pay | Visitors from China | Cross-border merchant account through an acquirer | Merchant approval |
| Alipay+ (direct) | Visitors (Fonepay QRs already take Alipay+) | Acquiring partner onboarding | Merchant approval |
| Amazon Seller | Listings and orders | SP-API; your own private app | Merchant approval |
| Etsy | Listings and orders | Open API v3 (app key approval) | Merchant approval |
| eBay | Listings and orders | Sell APIs (open developer programme) | Merchant account |
| TikTok Shop | Products and orders | Partner Center app | Stratek partner approval |
| Daraz | Products and orders | Open Platform app (approval) | Merchant approval |

### Parked

| Integration | What it does | API | Approval |
|---|---|---|---|
| Fonepay dynamic QR (direct) | Fonepay QR without an aggregator | Merchant API through a bank / Fonepay agreement (PayBridgeNP covers it today) | Merchant approval |
| Yango Delivery | Same-day courier | Claims API with a Yango business account | Merchant account |
| Pick & Drop | Courier (Nepal) | No public API found | Partner deal (to confirm) |
| inDrive | Courier / rides | No public delivery API | No public API |

Sources: [Amazon Supply Chain Services (May 2026)](https://press.aboutamazon.com/2026/5/amazon-launches-amazon-supply-chain-services-opening-its-logistics-network-to-all-businesses), [SP-API Fulfillment Outbound](https://developer-docs.amazon.com/sp-api/docs/fulfillment-outbound-api), [JLCPCB API platform](https://api.jlcpcb.com/), [PCBWay partner API](https://api-partner.pcbway.com/), [Cloudbeds API](https://www.cloudbeds.com/api/), [Mews API](https://www.mews.com/en/products/api).
