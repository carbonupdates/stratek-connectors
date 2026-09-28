# Adding an integration

1. Create `src/integrations/<id>.js`:

```js
export default {
  id: 'example',                 // lowercase, used in URLs
  name: 'Example',
  description: 'What it does, in one line.',
  secrets: [{ name: 'EXAMPLE_API_KEY', label: 'Example API key' }],
  actions: [{
    id: 'do_thing',
    label: 'Do the thing',       // button text in Stratek
    placement: ['transaction'],  // transaction | charge | settings
    fields: [{ name: 'note', label: 'Note', type: 'text' }],
    async run({ env, fields, context, claims }) {
      // env.EXAMPLE_API_KEY is the shop's secret. context.transaction is the sale.
      const res = await fetch('https://api.example.com/things', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.EXAMPLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: context.transaction?.amount, note: fields.note }),
      });
      if (!res.ok) throw new Error(`Example said no (${res.status}).`); // shown to the person
      const data = await res.json();
      return { type: 'link', title: 'Done', text: 'Track it here:', url: data.url, linkLabel: 'Open' };
    },
  }],
};
```

2. Add it to `INTEGRATIONS` in `src/registry.js`.
3. Add a row to the table in `README.md`, bump `version` in `package.json` and
   `CONNECTOR_VERSION` in `src/version.js`, then run `npm run bundle` (rebuilds
   `dist/connector.json`, the file Stratek installs) and `npm test` (fails if
   the bundle is out of date). Push. Every shop's Integrations tab then shows
   "Update available"; **Update connector** + a fresh token installs it.

Only plain JavaScript in `src/` (no npm packages at runtime): Stratek uploads
the files as they are, without a build step.

Rules: never log or return secret values; keep each action under Cloudflare's
free-plan limits (10 ms CPU, 50 outbound requests per call); return one of the
result types in [CONNECTORS.md](../CONNECTORS.md).
