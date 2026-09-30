# Coming soon: build waves

Every integration below is already in the connector's catalogue as a **Coming soon** scaffold (key fields and buttons drafted, `run` not built yet). Stratek lists them faded. To build one, follow `docs/adding-an-integration.md`, write each action's `run`, set `status: 'available'`, add a test and bump the version.

Order: open APIs we can build and test with a sandbox first; partner-only ones once the shop (or Stratek) has the partner account. Buttons only -- nothing runs by itself. Anything that spends money (shipping labels, fulfilment orders, PCB orders, refunds) needs a person (approval request for AI agents).

## Wave 3 -- messaging, commerce, accounting (open APIs)

| Integration | Buttons / what it does | API access |
|---|---|---|
| [WhatsApp Business](https://developers.facebook.com/docs/whatsapp/cloud-api) | Receipts, payment QRs and owner alerts on WhatsApp | Meta Cloud API (business verification, approved templates) |
| [Viber](https://developers.viber.com/docs/api/rest-bot-api/) | Send receipt on Viber | Viber REST Bot API (the customer subscribes to your bot) or Viber Business Messages via a partner. |
| [WooCommerce](https://woocommerce.github.io/woocommerce-rest-api-docs/) | Sync products and orders with a WooCommerce store | REST API (consumer key/secret) |
| [Shopify](https://shopify.dev/docs/api/admin) | Sync products and orders with a Shopify store | Admin API (custom app token) |
| [QuickBooks Online](https://developer.intuit.com/) | Send sales as invoices / sales receipts | OAuth 2.0 (Intuit developer app) |
| [Xero](https://developer.xero.com/) | Send sales as invoices | OAuth 2.0 (Xero app) |
| [Zoho Books](https://www.zoho.com/books/api/v3/) | Send sale to Zoho Books | Zoho Books API v3 (OAuth). |
| [DHL Express](https://developer.dhl.com/) | International rates, labels and tracking | MyDHL API (DHL Express account) |

## Wave 4 -- shipping & fulfilment

| Integration | Buttons / what it does | API access |
|---|---|---|
| [FedEx](https://developer.fedex.com/api/en-us/home.html) | Get FedEx rate, Ship with FedEx, Track FedEx shipment | Open API (FedEx Developer Portal): OAuth client credentials; Rate, Ship and Track APIs. |
| [UPS](https://developer.ups.com/) | Get UPS rate, Ship with UPS, Track UPS shipment | Open API (UPS Developer Portal): OAuth; Rating, Shipping and Tracking APIs. |
| [Aramex](https://www.aramex.com/us/en/developers-solution-center) | Get Aramex rate, Ship with Aramex, Track Aramex shipment | Aramex Shipping / Rate / Tracking web services; credentials from your Aramex account manager. |
| [Easyship](https://developers.easyship.com/) | Get Easyship rate, Ship with Easyship, Track Easyship shipment | Open REST API with a bearer token. |
| [ShipStation](https://www.shipstation.com/docs/api/) | Send order to ShipStation, Track ShipStation shipment | Open REST API (basic auth). |
| [ShipBob](https://developer.shipbob.com/) | Fulfil with ShipBob, Track ShipBob order | Open REST API (personal access token or OAuth). |
| [Amazon Multi-Channel Fulfillment](https://developer-docs.amazon.com/sp-api/docs/fulfillment-outbound-api) | Preview Amazon fulfillment, Fulfil with Amazon (MCF), Track Amazon fulfillment | Selling Partner API, Fulfillment Outbound v2020-07-01 (getFulfillmentPreview, createFulfillmentOrder, getPackageTrackingDetails). Needs an Amazon seller account with FBA inventory. |
| [Amazon Supply Chain Services](https://supplychain.amazon.com/) | Ship with Amazon Supply Chain, Track Amazon Supply Chain shipment | Opened to all businesses in May 2026 (Amazon Supply Chain Services); API access details to confirm when building. |
| [Shiprocket](https://apidocs.shiprocket.in/) | Ship with Shiprocket, Track Shiprocket shipment | Open REST API (token from an API user). |

## Wave 5 -- hotels & hospitality (open PMS APIs first)

| Integration | Buttons / what it does | API access |
|---|---|---|
| [Cloudbeds](https://www.cloudbeds.com/api/) | Charge to room (Cloudbeds), Today's arrivals (Cloudbeds) | Open REST API (API key / OAuth). |
| [Mews](https://mews-systems.gitbook.io/connector-api/) | Charge to room (Mews), Guests in house (Mews) | Mews Connector API (open; certification before production). |
| [Oracle OPERA Cloud](https://docs.oracle.com/en/industries/hospitality/integration-platform/) | Charge to room (OPERA) | Oracle Hospitality Integration Platform (OHIP); partner / customer credentials. |
| [OpenTable](https://platform.opentable.com/) | Today's bookings (OpenTable) | OpenTable partner API (approval required). |
| [SiteMinder](https://developer.siteminder.com/) | Room availability (SiteMinder) | Partner programme (SiteConnect / pmsXchange). |
| [Booking.com](https://connect.booking.com/) | Booking.com reservations | Booking.com Connectivity Partner Programme only (approval required). |
| [Expedia Group](https://developers.expediagroup.com/supply/lodging) | Expedia reservations | Expedia Group lodging connectivity (partner access). |
| [Airbnb](https://www.airbnb.com/partner) | Airbnb bookings | Airbnb API is for approved software partners only. |
| [Foodmandu](https://foodmandu.com/) | Foodmandu orders | No public API -- partner access to confirm with Foodmandu. |

## Wave 6 -- manufacturing, print-on-demand & sourcing

| Integration | Buttons / what it does | API access |
|---|---|---|
| [Printful](https://developers.printful.com/docs/) | Send order to Printful, Track Printful order | Open REST API with a private token. |
| [Printify](https://developers.printify.com/) | Send order to Printify, Track Printify order | Open REST API with a personal access token. |
| [CJdropshipping](https://developers.cjdropshipping.com/) | Import CJ product, Order from CJ, Track CJ order | Open API (API key -> access token). |
| [JLCPCB](https://api.jlcpcb.com/) | Quote PCB (JLCPCB), Order PCB (JLCPCB), Track JLCPCB order | JLCPCB API platform (application required): quote, order and track PCB / SMT / 3D orders. |
| [PCBWay](https://api-partner.pcbway.com/) | Quote PCB (PCBWay), Order PCB (PCBWay), Track PCBWay order | PCBWay Partner API (application required). |
| [AliExpress dropshipping](https://openservice.aliexpress.com/) | Import AliExpress product, Order from AliExpress, Track AliExpress order | AliExpress Open Platform dropshipping (DS) APIs (app approval required). |
| [Alibaba.com](https://openapi.alibaba.com/) | Search Alibaba suppliers, Track Alibaba order | Alibaba.com Open Platform (app approval required). |
| [Made-in-China.com](https://www.made-in-china.com/) | Search Made-in-China suppliers | Partner access to confirm. |

## Wave 7 -- more payments & marketplaces

| Integration | Buttons / what it does | API access |
|---|---|---|
| [IME Pay](https://www.imepay.com.np/) | Pay with IME Pay, Check IME Pay payment | IME Pay merchant e-payment API (merchant agreement). |
| [Prabhu Pay](https://prabhupay.com/) | Pay with Prabhu Pay, Check Prabhu Pay payment | Merchant API (merchant agreement). |
| [Razorpay (UPI)](https://razorpay.com/docs/api/) | Cards and UPI for INR shops | Open API |
| [Paytm](https://business.paytm.com/docs) | Pay with Paytm, Check Paytm payment | Paytm Payment Gateway API. |
| [Payoneer](https://developer.payoneer.com/) | Request payment (Payoneer), Check Payoneer payment | Payoneer API (partner programme). |
| [WeChat Pay](https://pay.weixin.qq.com/wiki/doc/api_external/en/index.shtml) | Pay with WeChat Pay, Check WeChat Pay payment | Cross-border merchant account through an acquirer (partner). |
| [Alipay+ (direct)](https://docs.alipayplus.com/) | Pay with Alipay+, Check Alipay+ payment | Alipay+ acquiring partner onboarding. |
| [Amazon Seller](https://developer-docs.amazon.com/sp-api/) | Sync inventory to Amazon, Amazon orders | Selling Partner API (Listings, Orders). |
| [Etsy](https://developers.etsy.com/) | Sync inventory to Etsy, Etsy orders | Etsy Open API v3 (OAuth). |
| [eBay](https://developer.ebay.com/) | Sync inventory to eBay, eBay orders | eBay Sell APIs (OAuth). |
| [TikTok Shop](https://partner.tiktokshop.com/docv2) | Sync inventory to TikTok Shop, TikTok Shop orders | TikTok Shop Partner Center (app approval). |
| [Daraz](https://open.daraz.com/) | Sync products and orders with Daraz | Daraz Open Platform (app approval) |

## Parked -- need a partner deal or have no public API

| Integration | Buttons / what it does | API access |
|---|---|---|
| [Fonepay dynamic QR (direct)](https://fonepay.com/) | Fonepay QR without an aggregator | Merchant API via bank / Fonepay agreement |
| [Yango Delivery](https://yango.com/) | Same-day courier deliveries | Claims API with a Yango business account |
| [Pick & Drop](https://pickndropnepal.com/) | Courier deliveries in Nepal | No public API found (partner) |
| [inDrive](https://indrive.com/) | Courier / rides | No public delivery API |

Sources: [Amazon Supply Chain Services (May 2026)](https://press.aboutamazon.com/2026/5/amazon-launches-amazon-supply-chain-services-opening-its-logistics-network-to-all-businesses), [SP-API Fulfillment Outbound](https://developer-docs.amazon.com/sp-api/docs/fulfillment-outbound-api), [JLCPCB API platform](https://api.jlcpcb.com/), [PCBWay partner API](https://api-partner.pcbway.com/), [Cloudbeds API](https://www.cloudbeds.com/api/), [Mews API](https://www.mews.com/en/products/api).
