# Adding an integration

Every integration is one file in `src/integrations/`, listed in
`src/integrations/catalogue.js`. Most of the big ones already exist as
**scaffolds** (`status: 'planned'`): their buttons and key fields are drafted,
Stratek lists them as "Coming soon". Building one means filling it in.

## Building a scaffold (e.g. Stripe, Pathao, Yango)

1. Open `src/integrations/<id>.js`. Check the key fields (`secrets`) and
   buttons (`actions`) against the real API and adjust them.
2. Write each action's `run` (replace `notBuilt(...)`):

```js
export default {
  id: 'example',                 // lowercase, used in URLs
  name: 'Example',
  category: 'automation',        // payments | delivery | messaging | accounting | commerce | marketing | automation
  status: 'available',           // was 'planned'
  description: 'What it does, in one line.',
  docsUrl: 'https://api.example.com/docs',
  // Keys the Set up form asks for. Stratek shows the labels; values reach run() as env.<name>.
  secrets: [
    { name: 'EXAMPLE_API_KEY', label: 'Example API key', hint: 'Dashboard -> Developers -> API keys.' },
    { name: 'EXAMPLE_REGION', label: 'Region', optional: true },
  ],
  actions: [{
    id: 'do_thing',
    label: 'Do the thing',       // button text in Stratek
    placement: ['transaction'],  // transaction | charge | settings
    fields: [{ name: 'note', label: 'Note', type: 'text' }],
    async run({ env, fields, context, claims }) {
      // env.EXAMPLE_API_KEY is the shop's key. context.transaction is the sale.
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

3. Set `status: 'available'`. The Set up form, the Ready badge and the buttons
   in Stratek then work by themselves -- no Stratek change needed.

## A brand-new integration

Create `src/integrations/<id>.js` like the example (use `status: 'planned'` and
`notBuilt('<Name>')` for a scaffold), import it in `catalogue.js`, and add a row
to the table in `README.md`.

## Releasing

Bump `version` in `package.json` and `CONNECTOR_VERSION` in `src/version.js`
(same number), run `npm run bundle` (rebuilds `dist/connector.json`, the file
Stratek installs) and `npm test` (fails if the bundle is out of date). Push.
Every shop's Integrations tab then shows "Update available"; **Update
connector** + a fresh token installs it. Changes pushed without a version bump
reach only new installs -- always bump when `src/` changes.

Only plain JavaScript in `src/` (no npm packages at runtime): Stratek uploads
the files as they are, without a build step.

Rules: never log or return secret values; keep each action under Cloudflare's
free-plan limits (10 ms CPU, 50 outbound requests per call); return one of the
result types in [CONNECTORS.md](../CONNECTORS.md).
