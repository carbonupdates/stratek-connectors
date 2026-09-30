// catalogue.js -- every integration the connector knows, in the order Stratek lists them.
// New integration: create src/integrations/<id>.js and import it here.

import stripe from './stripe.js';
import paypal from './paypal.js';
import khalti from './khalti.js';
import esewa from './esewa.js';
import fonepay from './fonepay.js';
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

export const CATALOGUE = [
  ai_employee,
  stripe,
  paypal,
  khalti,
  esewa,
  fonepay,
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
  slant3d,
  amazon_mcf,
  amazon_scs,
  shipbob,
  jlcpcb,
  pcbway,
  printful,
  printify,
  alibaba,
  aliexpress,
  cj_dropshipping,
  made_in_china,
  cloudbeds,
  mews,
  opera_cloud,
  siteminder,
  booking_com,
  expedia,
  airbnb,
  opentable,
  foodmandu,
  whatsapp,
  sparrow_sms,
  telegram,
  viber,
  slack,
  ird_cbms,
  quickbooks,
  xero,
  google_sheets,
  zoho_books,
  shopify,
  woocommerce,
  daraz,
  amazon_seller,
  etsy,
  ebay,
  tiktok_shop,
  meta_catalog,
  mailchimp,
  hubspot,
  meta_capi,
  webhook,
  zapier,
  make,
];
