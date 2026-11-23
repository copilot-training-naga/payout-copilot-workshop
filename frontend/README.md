# Angular Payout Lab

This standalone Angular application is an interactive GitHub Copilot
workshop. It uses Angular signals, template bindings, and forms to present six
lessons, a browser-only payout simulator, and a frontend architecture map.

## Local development

Install Git, Node.js 24.15 or later in the 24 LTS series, and npm. Use the setup commands on the published
workshop to create a branch from the source revision used by that site. From
a checkout containing `frontend/`, run:

```bash
cd frontend
npm ci
npm start
```

Open `http://localhost:4200`. In another terminal, from `frontend/`, run the checks:

```bash
npm test -- --watch=false
npm run build -- --base-href /payout-copilot-workshop/
```

Production output is `dist/workshop-frontend/browser/`.

## Workshop path

1. Start the application locally.
2. Read the component, template, simulator, and tests; establish a passing
   test baseline.
3. Ask Copilot Plan Mode to plan a simulator reset button.
4. Review input validation, accessibility, progress storage, and
   fixed-point arithmetic.
5. Implement the optional reset-button exercise with Agent Mode and run the
   frontend checks.
6. In your own branch, practice reproducing and fixing a rounding or progress
   persistence defect.

## Source map

- `src/app/app.ts`: standalone component, signals, navigation, and progress.
- `src/app/app.html`: workshop layout, forms, and template bindings.
- `src/app/simulation.ts`: browser-only payout calculation.
- `src/app/app.spec.ts` and `src/app/simulation.spec.ts`: component and model
  tests.
- `src/styles.css`: responsive layout and visual styling.
- `../.github/workflows/pages.yml`: frontend checks, build, and Pages deployment.

## Simulation and progress

The simulator does not send an API request, verify a real signature, move
money, or store secrets. Each run is an independent scenario starting with
100 USD. Duplicate delivery assumes an identical event was already processed;
only completed events credit the balance. Illustrative rates are
1 USD = 0.92 EUR and 1 USD = 0.79 GBP; they are not live quotes. Amounts use
integer fixed-point arithmetic and four-decimal half-up rounding.

Progress is stored locally under `payout-angular-workshop-progress-v1`. The
rewritten lessons start with a fresh progress record because their completion
criteria have changed. Storage and clipboard errors are shown in the UI.

## Publishing

The Pages workflow installs dependencies, runs the frontend tests, builds with
the repository base path, and publishes the resulting files. It embeds the
deployment commit in the workshop's source links, so the guide points to the
code that produced the site. Local builds without a supplied source revision
link to `v-nagarajumatta-angular-workshop-site`.
