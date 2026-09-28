// registry.js -- the list of integrations this connector knows.
// Adding an integration = add a file in src/integrations/ and list it here.
// An integration is "ready" when all its secrets are set in the Cloudflare
// dashboard; the Stratek POS only shows buttons for ready integrations.

import core from './integrations/core.js';
import pathao from './integrations/pathao.js';

export const INTEGRATIONS = [core, pathao].filter((i) => i.enabled !== false);

export function isReady(integration, env) {
  return integration.secrets.every((s) => typeof env[s.name] === 'string' && env[s.name].trim() !== '');
}

/** What the POS gets from GET /manifest -- never includes secret values. */
export function manifest(env) {
  return INTEGRATIONS.map((i) => {
    const ready = isReady(i, env);
    return {
      id: i.id,
      name: i.name,
      description: i.description,
      ready,
      missingSecrets: ready ? [] : i.secrets.filter((s) => !(typeof env[s.name] === 'string' && env[s.name].trim())).map((s) => s.name),
      actions: i.actions.map(({ run, ...a }) => a),
    };
  });
}

export function findAction(integrationId, actionId) {
  const integration = INTEGRATIONS.find((i) => i.id === integrationId);
  const action = integration?.actions.find((a) => a.id === actionId);
  return integration && action ? { integration, action } : null;
}
