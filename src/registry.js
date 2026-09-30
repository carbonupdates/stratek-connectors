// registry.js -- the list of integrations this connector knows.
//
// Adding an integration = add a file in src/integrations/ and list it in
// src/integrations/catalogue.js. Each one has a `status`:
//   'available' -- built: once its keys are set it is "ready" and its buttons
//                  appear in Stratek;
//   'planned'   -- scaffold only: listed in Stratek as "Coming soon", no
//                  buttons, keys can't be entered yet.
//
// Keys come from the "Set up" form (stored in this connector's Durable Object)
// or from Cloudflare Secrets with the same name; the Set up form wins.

import core from './integrations/core.js';
import { CATALOGUE } from './integrations/catalogue.js';

export const INTEGRATIONS = [core, ...CATALOGUE];

export const CATEGORIES = {
  system: 'Connector',
  payments: 'Payments',
  delivery: 'Delivery & rides',
  fulfilment: 'Manufacturing & fulfilment',
  messaging: 'Messages & notifications',
  accounting: 'Accounting & tax',
  commerce: 'Online stores & marketplaces',
  marketing: 'Customers & marketing',
  automation: 'Automation',
  ai: 'AI employee',
};

const has = (v) => typeof v === 'string' && v.trim() !== '';
export const statusOf = (i) => i.status || 'available';
export const MODES = ['live', 'test'];
export const modeOf = (m) => (m === 'test' ? 'test' : 'live');

// Test vs live keys. Every integration has two sets of keys, entered
// separately in its Set up page. `test` in an integration describes its test
// environment:
//   support: 'sandbox'    -- provider has a real test environment
//            'real-money' -- test keys exist but some payments still move real money (e.g. Fonepay)
//            'none'       -- provider has no test environment: live only
//   note:    shown on the Set up page
//   omit:    live key names not used in test; extraSecrets: keys only for test
//   hints:   { KEY_NAME: 'test-specific hint' }
export const testInfo = (i) => ({ support: 'sandbox', note: null, ...(i.test || {}) });
export function secretsFor(i, mode = 'live') {
  const all = i.secrets || [];
  if (modeOf(mode) === 'live') return all;
  const t = testInfo(i);
  if (t.support === 'none') return [];
  const omit = new Set(t.omit || []);
  return [
    ...all.filter((s) => !omit.has(s.name)).map((s) => (t.hints?.[s.name] ? { ...s, hint: t.hints[s.name] } : s)),
    ...(t.extraSecrets || []),
  ];
}
export const requiredSecrets = (i, mode = 'live') => secretsFor(i, mode).filter((s) => !s.optional);
export const allSecretNames = () => [...new Set(INTEGRATIONS.flatMap((i) => [...secretsFor(i, 'live'), ...secretsFor(i, 'test')].map((s) => s.name)))];

export function findIntegration(id) {
  return INTEGRATIONS.find((i) => i.id === id) || null;
}

export function isReady(integration, keys, mode = 'live') {
  if (statusOf(integration) !== 'available') return false;
  if (modeOf(mode) === 'test' && testInfo(integration).support === 'none') return false;
  const req = requiredSecrets(integration, mode);
  if (!req.length && modeOf(mode) === 'test' && !(integration.secrets || []).length) return true; // nothing to set (e.g. core)
  return req.every((s) => has(keys[s.name]));
}

/** What the POS gets from GET /manifest -- never includes secret values. `keys` = live, `testKeys` = test. */
export function manifest(keys, testKeys = {}) {
  return INTEGRATIONS.map((i) => {
    const status = statusOf(i);
    const ready = isReady(i, keys);
    const t = testInfo(i);
    const testReady = isReady(i, testKeys, 'test');
    return {
      id: i.id,
      name: i.name,
      category: i.category || 'system',
      description: i.description,
      status,
      docsUrl: i.docsUrl || null,
      color: i.color || null,           // button colour in Stratek
      qrProvider: !!i.qrProvider,       // can make the till/kiosk payment QR (see POS "Use for the till QR")
      ready,                            // live keys complete
      testReady,                        // test keys complete
      test: { support: t.support, note: t.note || null },
      setup: status === 'available' && (i.secrets || []).length > 0,
      missingSecrets: ready ? [] : requiredSecrets(i).filter((s) => !has(keys[s.name])).map((s) => s.name),
      secrets: (i.secrets || []).map((s) => ({ name: s.name, label: s.label, optional: !!s.optional, set: has(keys[s.name]) })),
      testSecrets: secretsFor(i, 'test').map((s) => ({ name: s.name, label: s.label, optional: !!s.optional, set: has(testKeys[s.name]) })),
      actions: (i.actions || []).map(({ run, ...a }) => ({ ...a, outbound: isOutbound(a) })),
    };
  });
}
/**
 * Outbound actions move money out of the shop or commit it to a real-world
 * cost (refunds, booking a rider, paying for a print). A person must run them:
 * API keys / AI agents are refused and use Stratek's approval requests instead.
 * Marked with `outbound: true`; ids like refund / create_delivery / confirm /
 * payout / transfer are treated as outbound even if a scaffold forgets it.
 */
export const isOutbound = (a) => a.outbound === true || (a.outbound !== false && /^(refund|create_delivery|confirm|payout|transfer|send_money)/.test(a.id || ''));

export function findAction(integrationId, actionId) {
  const integration = findIntegration(integrationId);
  const action = integration?.actions?.find((a) => a.id === actionId);
  return integration && action ? { integration, action } : null;
}
