// core -- built in, always ready. "Test connection" on the Stratek
// Integrations tab calls this to prove the whole chain works:
// POS -> signed pass -> this connector -> reply.

import { CONNECTOR_VERSION } from '../version.js';

export default {
  id: 'core',
  name: 'Connector',
  category: 'system',
  status: 'available',
  description: 'Built-in checks for the connector itself.',
  secrets: [],
  actions: [
    {
      id: 'ping',
      label: 'Test connection',
      placement: ['settings'],
      fields: [],
      async run({ claims }) {
        return {
          type: 'message',
          title: 'Connector is working',
          text: `Connected and verified for ${claims.owner_name || claims.sub}. Connector version ${CONNECTOR_VERSION}.`,
        };
      },
    },
  ],
};
