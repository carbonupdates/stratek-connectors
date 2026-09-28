// state.js -- the connector's tiny memory: which Stratek account it is paired
// with, Stratek's public key, and a one-time "state" value during pairing.
// One Durable Object instance (named "config") per connector.
//
// Plain fetch-based Durable Object (no `cloudflare:workers` import), so the
// rest of the code can be tested in plain Node with a stand-in.

export class ConnectorState {
  constructor(state) {
    this.storage = state.storage;
  }

  async fetch(request) {
    const { op, key, value } = await request.json();
    if (op === 'get') return Response.json({ value: (await this.storage.get(key)) ?? null });
    if (op === 'put') { await this.storage.put(key, value); return Response.json({ ok: true }); }
    if (op === 'delete') { await this.storage.delete(key); return Response.json({ ok: true }); }
    return new Response('bad op', { status: 400 });
  }
}

/** Small helper around the Durable Object. */
export function store(env) {
  const stub = env.STATE.get(env.STATE.idFromName('config'));
  const call = async (op, key, value) => {
    const res = await stub.fetch('https://state/', { method: 'POST', body: JSON.stringify({ op, key, value }) });
    return (await res.json()).value;
  };
  return {
    get: (key) => call('get', key),
    put: (key, value) => call('put', key, value),
    delete: (key) => call('delete', key),
  };
}
