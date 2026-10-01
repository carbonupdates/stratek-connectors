// catalogue.js -- every integration the connector knows, in the order Stratek lists them.
// New integration: create src/integrations/<id>.js and import it here.

import stripe from './stripe.js';
import paypal from './paypal.js';
import khalti from './khalti.js';
import esewa from './esewa.js';
import fonepay from './fonepay.js';
import foneloan from './foneloan.js';
import connectips from './connectips.js';
import paybridgenp from './paybridgenp.js';
import razorpay from './razorpay.js';
import coinbase from './coinbase.js';
import slant3d from './slant3d.js';
import meta_capi from './meta_capi.js';
import meta_catalog from './meta_catalog.js';
import pathao from './pathao.js';
import yango from './yango.js';
import pickndrop from './pickndrop.js';
import indrive from './indrive.js';
import dhl from './dhl.js';
import whatsapp from './whatsapp.js';
import sparrow_sms from './sparrow_sms.js';
import telegram from './telegram.js';
import slack from './slack.js';
import ird_cbms from './ird_cbms.js';
import quickbooks from './quickbooks.js';
import xero from './xero.js';
import google_sheets from './google_sheets.js';
import shopify from './shopify.js';
import woocommerce from './woocommerce.js';
import daraz from './daraz.js';
import mailchimp from './mailchimp.js';
import hubspot from './hubspot.js';
import webhook from './webhook.js';
import zapier from './zapier.js';
import make from './make.js';
import ai_employee from './ai_employee.js';
import chatwoot from './chatwoot.js';
import postiz from './postiz.js';
import ime_pay from './ime_pay.js';
import prabhu_pay from './prabhu_pay.js';
import wechat_pay from './wechat_pay.js';
import alipay from './alipay.js';
import paytm from './paytm.js';
import payoneer from './payoneer.js';
import fedex from './fedex.js';
import ups from './ups.js';
import aramex from './aramex.js';
import easyship from './easyship.js';
import shipstation from './shipstation.js';
import shiprocket from './shiprocket.js';
import amazon_mcf from './amazon_mcf.js';
import amazon_scs from './amazon_scs.js';
import shipbob from './shipbob.js';
import jlcpcb from './jlcpcb.js';
import pcbway from './pcbway.js';
import printful from './printful.js';
import printify from './printify.js';
import alibaba from './alibaba.js';
import aliexpress from './aliexpress.js';
import cj_dropshipping from './cj_dropshipping.js';
import made_in_china from './made_in_china.js';
import cloudbeds from './cloudbeds.js';
import mews from './mews.js';
import opera_cloud from './opera_cloud.js';
import siteminder from './siteminder.js';
import booking_com from './booking_com.js';
import expedia from './expedia.js';
import airbnb from './airbnb.js';
import opentable from './opentable.js';
import foodmandu from './foodmandu.js';
import viber from './viber.js';
import zoho_books from './zoho_books.js';
import amazon_seller from './amazon_seller.js';
import etsy from './etsy.js';
import ebay from './ebay.js';
import tiktok_shop from './tiktok_shop.js';
import square from './square.js';
import mollie from './mollie.js';
import braintree from './braintree.js';
import mercado_pago from './mercado_pago.js';
import flutterwave from './flutterwave.js';
import paystack from './paystack.js';
import xendit from './xendit.js';
import midtrans from './midtrans.js';
import nowpayments from './nowpayments.js';
import btcpay from './btcpay.js';
import shippo from './shippo.js';
import easypost from './easypost.js';
import shipengine from './shipengine.js';
import sendcloud from './sendcloud.js';
import aftership from './aftership.js';
import track17 from './track17.js';
import gelato from './gelato.js';
import prodigi from './prodigi.js';
import lulu from './lulu.js';
import bigbuy from './bigbuy.js';
import beds24 from './beds24.js';
import lodgify from './lodgify.js';
import hostaway from './hostaway.js';
import guesty from './guesty.js';
import smoobu from './smoobu.js';
import twilio from './twilio.js';
import resend from './resend.js';
import postmark from './postmark.js';
import vonage from './vonage.js';
import bird from './bird.js';
import discord from './discord.js';
import ms_teams from './ms_teams.js';
import google_chat from './google_chat.js';
import line from './line.js';
import pushover from './pushover.js';
import ntfy from './ntfy.js';
import erpnext from './erpnext.js';
import odoo from './odoo.js';
import freshbooks from './freshbooks.js';
import airtable from './airtable.js';
import notion from './notion.js';
import akaunting from './akaunting.js';
import manager_io from './manager_io.js';
import bigcommerce from './bigcommerce.js';
import wix from './wix.js';
import squarespace from './squarespace.js';
import ecwid from './ecwid.js';
import magento from './magento.js';
import prestashop from './prestashop.js';
import opencart from './opencart.js';
import google_merchant from './google_merchant.js';
import gumroad from './gumroad.js';
import google_analytics from './google_analytics.js';
import tiktok_events from './tiktok_events.js';
import klaviyo from './klaviyo.js';
import brevo from './brevo.js';
import mailerlite from './mailerlite.js';
import activecampaign from './activecampaign.js';
import pipedrive from './pipedrive.js';
import zoho_crm from './zoho_crm.js';
import n8n from './n8n.js';
import pipedream from './pipedream.js';
import ifttt from './ifttt.js';
import power_automate from './power_automate.js';

export const CATALOGUE = [
  ai_employee,
  stripe,
  paypal,
  khalti,
  esewa,
  fonepay,
  foneloan,
  connectips,
  paybridgenp,
  razorpay,
  coinbase,
  ime_pay,
  prabhu_pay,
  wechat_pay,
  alipay,
  paytm,
  payoneer,
  square,
  mollie,
  braintree,
  mercado_pago,
  flutterwave,
  paystack,
  xendit,
  midtrans,
  nowpayments,
  btcpay,
  pathao,
  yango,
  pickndrop,
  indrive,
  dhl,
  fedex,
  ups,
  aramex,
  easyship,
  shipstation,
  shiprocket,
  shippo,
  easypost,
  shipengine,
  sendcloud,
  aftership,
  track17,
  slant3d,
  amazon_mcf,
  amazon_scs,
  shipbob,
  jlcpcb,
  pcbway,
  printful,
  printify,
  gelato,
  prodigi,
  lulu,
  alibaba,
  aliexpress,
  cj_dropshipping,
  made_in_china,
  bigbuy,
  cloudbeds,
  mews,
  opera_cloud,
  siteminder,
  booking_com,
  expedia,
  airbnb,
  opentable,
  foodmandu,
  beds24,
  lodgify,
  hostaway,
  guesty,
  smoobu,
  whatsapp,
  sparrow_sms,
  telegram,
  chatwoot,
  viber,
  slack,
  twilio,
  resend,
  postmark,
  vonage,
  bird,
  discord,
  ms_teams,
  google_chat,
  line,
  pushover,
  ntfy,
  ird_cbms,
  quickbooks,
  xero,
  google_sheets,
  zoho_books,
  erpnext,
  odoo,
  freshbooks,
  airtable,
  notion,
  akaunting,
  manager_io,
  shopify,
  woocommerce,
  daraz,
  amazon_seller,
  etsy,
  ebay,
  tiktok_shop,
  bigcommerce,
  wix,
  squarespace,
  ecwid,
  magento,
  prestashop,
  opencart,
  google_merchant,
  gumroad,
  meta_catalog,
  mailchimp,
  hubspot,
  postiz,
  meta_capi,
  google_analytics,
  tiktok_events,
  klaviyo,
  brevo,
  mailerlite,
  activecampaign,
  pipedrive,
  zoho_crm,
  webhook,
  zapier,
  make,
  n8n,
  pipedream,
  ifttt,
  power_automate,
];
