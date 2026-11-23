# Angular Payout Lab: Workshop Guide

Explore a standalone Angular application and use GitHub Copilot to plan,
implement, test, and debug a small frontend feature. The payout simulator is
an educational model: it runs in the browser with example data and does not
send an API request, verify a real signature, or move money.

## 1. Start the application

Install Git, Node.js 24.15 or later in the 24 LTS series, and npm. Use the
setup commands on the [published workshop](https://copilot-training-naga.github.io/payout-copilot-workshop/#step-1)
to clone the repository and create your own branch from the revision that
produced the site. From that checkout:

```bash
cd frontend
npm ci
npm start
```

Open [http://localhost:4200](http://localhost:4200). Leave the development
server running and use another terminal in `frontend/` for the remaining
commands.

## 2. Explore the code and tests

Read these frontend files:

- [`app.ts`](../frontend/src/app/app.ts): the standalone component and signals.
- [`app.html`](../frontend/src/app/app.html): the workshop, form, and bindings.
- [`simulation.ts`](../frontend/src/app/simulation.ts): payout outcomes and
  fixed-point currency conversion.
- [`app.spec.ts`](../frontend/src/app/app.spec.ts) and
  [`simulation.spec.ts`](../frontend/src/app/simulation.spec.ts): component
  and model behavior.

Establish a passing baseline:

```bash
npm test -- --watch=false
```

Check how the tests cover invalid simulated signatures, completed payouts,
other statuses, duplicate delivery, conversion, input validation, and saved
progress.

## 3. Plan a change with Copilot

In Copilot Plan Mode, use the following prompt:

```text
Plan a Reset simulation button for frontend/src/app/app.html and
frontend/src/app/app.ts. It should restore the simulator inputs and results
to their initial state without clearing workshop progress. Consider processing
state, accessibility, and tests. Do not write code yet.
```

Review the proposed changes. Check that they preserve workshop progress,
account for a simulation in progress, and make the new button usable with a
keyboard.

## 4. Review frontend boundaries

Before editing, note the following:

- Amount validation accepts positive values with at most two decimal places.
- The model uses integer fixed-point arithmetic and four-decimal half-up
  rounding; the displayed exchange rates are illustrative.
- Workshop progress is stored in the browser. Storage and clipboard errors
  are surfaced to the user.
- Simulation inputs represent hypothetical outcomes, not real requests or
  authentication checks.

## 5. Build and test the optional exercise

In Copilot Agent Mode, use the plan to implement a reset button:

```text
Implement a Reset simulation button in frontend/src/app/app.html and
frontend/src/app/app.ts. Restore COMPLETED, 25.00 USD, valid signature on,
duplicate off, and the waiting pipeline; clear the result without changing
workshop progress. Disable reset while processing. Add focused tests in
frontend/src/app/app.spec.ts, then run npm test -- --watch=false and
npm run build from frontend. Keep the simulation browser-only.
```

Review the changes and run:

```bash
npm test -- --watch=false
npm run build -- --base-href /payout-copilot-workshop/
```

Confirm that reset affects only the simulator, that the button cannot be
used while processing, and that the workshop progress is unchanged.

## 6. Practice debugging

In your own working branch, choose one challenge. Introduce the defect,
reproduce it, and ask Copilot to repair it with a regression test. Do not
publish the intentional defect.

- **Currency rounding:** remove the rounding adjustment in `simulation.ts`.
  The 25.00 GBP example should round to 131.6456 USD, not 131.6455 USD.
  Use the conversion tests to locate and fix the calculation.
- **Saved progress:** skip the `saveProgress` call in `toggleStep` in `app.ts`.
  Mark a step complete and reload; use the progress persistence test to locate
  and fix the missing save.

## Manual checks

1. Select COMPLETED, 25.00 USD, a valid simulated signature, and no duplicate.
   Run the model and confirm the example balance changes from 100.0000 to
   125.0000 USD.
2. Select duplicate delivery and run it again. The model assumes the same
   event was processed already and displays 125.0000 USD unchanged.
3. Mark a workshop step complete, reload, and confirm the selection persists.
4. Open the architecture map and follow a source link. On the published
   workshop, it should point to the commit used for that deployment.

The [frontend README](../frontend/README.md) describes the source layout,
simulation semantics, and Pages deployment.
