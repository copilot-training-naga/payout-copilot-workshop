# Angular Payout Workshop

[Open the interactive workshop](https://copilot-training-naga.github.io/payout-copilot-workshop/#overview)

Learn Angular and GitHub Copilot with a standalone payout simulator. The
workshop covers components, templates, signals, forms, tests, and publishing
to GitHub Pages. The simulator runs entirely in the browser with example data.

## Get started

Install Git, Node.js 24.15 or later in the 24 LTS series, and npm. Use the setup commands on the workshop
site to create a branch from the revision used by that site. Then, from the
repository checkout:

```bash
cd frontend
npm ci
npm start
```

Open [http://localhost:4200](http://localhost:4200). In another terminal, from
`frontend/`, run:

```bash
npm test -- --watch=false
npm run build -- --base-href /payout-copilot-workshop/
```

## Workshop path

1. Start the Angular application.
2. Read the component, template, simulator, and tests.
3. Use Copilot Plan Mode to plan a reset-button exercise.
4. Review validation, accessibility, and fixed-point calculations.
5. Implement and test the optional exercise with Agent Mode.
6. Practice debugging rounding or saved progress in your own branch.

See the [workshop guide](docs/lab-guide.md) for the exercises and the
[frontend README](frontend/README.md) for the application structure,
simulation semantics, and deployment details. Source links on the deployed
site point to the exact commit used for its build.
