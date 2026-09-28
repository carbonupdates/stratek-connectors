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

export const CATALOGUE = [
  stripe,
  paypal,
  khalti,
  esewa,
  fonepay,
  connectips,
  paybridgenp,
  razorpay,
  pathao,
  yango,
  pickndrop,
  indrive,
  dhl,
  whatsapp,
  sparrow_sms,
  telegram,
  slack,
  ird_cbms,
  quickbooks,
  xero,
  google_sheets,
  shopify,
  woocommerce,
  daraz,
  mailchimp,
  hubspot,
  webhook,
  zapier,
  make,
];
