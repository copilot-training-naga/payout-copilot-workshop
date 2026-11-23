# Angular workshop companion

This standalone Angular application migrates the repository's original static
workshop companion. Styling and workshop content are preserved; progress,
navigation, simulation, hints, and architecture selection use Angular signals
and template bindings.

## Local development

Use Node.js 24 LTS and npm:

```bash
npm ci
npm start
npm test -- --watch=false
npm run build -- --base-href /payout-copilot-workshop/
```

The development server runs at `http://localhost:4200`. Production output is
`dist/workshop-frontend/browser/`. The repository's Pages workflow builds and
publishes this directory.

## Simulation semantics

The simulator never calls the backend, signs real payloads, or stores secrets.
Each send is an independent scenario starting with 100 USD. Duplicate delivery
assumes the same status, amount, and currency were delivered previously.
Only completed events credit the balance. Illustrative rates are
1 USD = 0.92 EUR and 1 USD = 0.79 GBP, matching the reference model; they are not
live quotes or the backend's FX service. Amounts use integer fixed-point
arithmetic and four-decimal half-up rounding, avoiding floating-point money.

Progress is stored locally under the original `payout-workshop-progress-v1`
key. Unavailable storage or clipboard access is reported visibly.
