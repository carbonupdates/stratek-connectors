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
};

const has = (v) => typeof v === 'string' && v.trim() !== '';
export const statusOf = (i) => i.status || 'available';
export const requiredSecrets = (i) => (i.secrets || []).filter((s) => !s.optional);
export const allSecretNames = () => [...new Set(INTEGRATIONS.flatMap((i) => (i.secrets || []).map((s) => s.name)))];

export function findIntegration(id) {
  return INTEGRATIONS.find((i) => i.id === id) || null;
}

export function isReady(integration, keys) {
  return statusOf(integration) === 'available' && requiredSecrets(integration).every((s) => has(keys[s.name]));
}

/** What the POS gets from GET /manifest -- never includes secret values. */
export function manifest(keys) {
  return INTEGRATIONS.map((i) => {
    const status = statusOf(i);
    const ready = isReady(i, keys);
    return {
      id: i.id,
      name: i.name,
      category: i.category || 'system',
      description: i.description,
      status,
      docsUrl: i.docsUrl || null,
      color: i.color || null,           // button colour in Stratek
      qrProvider: !!i.qrProvider,       // can make the till/kiosk payment QR (see POS "Use for the till QR")
      ready,
      setup: status === 'available' && (i.secrets || []).length > 0,
      missingSecrets: ready ? [] : requiredSecrets(i).filter((s) => !has(keys[s.name])).map((s) => s.name),
      secrets: (i.secrets || []).map((s) => ({ name: s.name, label: s.label, optional: !!s.optional, set: has(keys[s.name]) })),
      actions: (i.actions || []).map(({ run, ...a }) => a),
    };
  });
}

export function findAction(integrationId, actionId) {
  const integration = findIntegration(integrationId);
  const action = integration?.actions?.find((a) => a.id === actionId);
  return integration && action ? { integration, action } : null;
}
