# Integrations: finished, remaining and build waves

**Tally (connector 0.22.0): 49 built, 23 coming soon, 72 in total** (the Connector itself not counted).

Coming-soon ones are already in the catalogue as scaffolds (key fields and buttons drafted, `run` not built). To build one: follow `docs/adding-an-integration.md`, write each action, set `status: 'available'`, add a test, bump the version. Buttons only -- nothing runs by itself. Anything that spends money (labels, fulfilment, PCB and dropship orders, refunds) needs a person (AI agents can only ask).

## What "approval" means

| Kind | Who | Meaning |
|---|---|---|
| **Merchant account** | the business | Anyone can sign up and get API keys; the business pastes them in Set up. (0 remaining) |
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

## Remaining (23)

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
