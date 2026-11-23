import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Currency, PayoutStatus, SimulationResult, simulateWebhook } from './simulation';

declare const __WORKSHOP_SOURCE_REF__: string;

@Component({
  imports: [FormsModule],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  readonly repoUrl = 'https://github.com/copilot-training-naga/payout-copilot-workshop';
  readonly sourceRef =
    typeof __WORKSHOP_SOURCE_REF__ === 'string'
      ? __WORKSHOP_SOURCE_REF__
      : 'v-nagarajumatta-angular-workshop-site';
  readonly sourceTreeUrl = `${this.repoUrl}/tree/${encodeURIComponent(this.sourceRef)}/frontend`;
  readonly stepLabels = [
    'Start the app',
    'Explore the code',
    'Plan a change',
    'Review the model',
    'Build and test',
    'Debug the UI',
  ];
  readonly exploreLinks = [
    { id: 'simulator', icon: '▶', label: 'Payout simulator' },
    { id: 'architecture', icon: '⌘', label: 'Angular architecture' },
    { id: 'manual', icon: '›_', label: 'Try it locally' },
    { id: 'troubleshooting', icon: '?', label: 'Troubleshooting' },
  ];
  private readonly checkoutRef = /^[0-9a-f]{40,64}$/i.test(this.sourceRef)
    ? this.sourceRef
    : `origin/${this.sourceRef}`;
  readonly setupCommand = `git clone ${this.repoUrl}.git\ncd payout-copilot-workshop\ngit switch -c angular-lab ${this.checkoutRef}\ncd frontend\nnpm ci\nnpm start`;
  readonly testCommand = 'npm test -- --watch=false';
  readonly verificationCommand =
    'npm test -- --watch=false\nnpm run build -- --base-href /payout-copilot-workshop/';
  readonly planPrompt =
    'Plan a Reset simulation button for frontend/src/app/app.html and frontend/src/app/app.ts. It should restore the simulator inputs and results to their initial state without clearing workshop progress. Consider processing state, accessibility, and tests. Do not write code yet.';
  readonly agentPrompt =
    'Implement a Reset simulation button in frontend/src/app/app.html and frontend/src/app/app.ts. Restore COMPLETED, 25.00 USD, valid signature on, duplicate off, and the waiting pipeline; clear the result without changing workshop progress. Disable reset while processing. Add focused tests in frontend/src/app/app.spec.ts, then run npm test -- --watch=false and npm run build from frontend. Keep the simulation browser-only.';
  readonly architectures = [
    {
      id: 'component',
      icon: 'TS',
      color: 'blue',
      label: 'Component',
      subtitle: 'Handle interactions',
      responsibility:
        'The standalone App component connects user actions to the simulator, navigation, and progress.',
      risk: 'Changes to one interaction should not unexpectedly reset another part of the page.',
      file: 'app.ts',
      path: 'frontend/src/app/app.ts',
    },
    {
      id: 'template',
      icon: 'HTML',
      color: 'red',
      label: 'Template',
      subtitle: 'Render the UI',
      responsibility:
        'Angular bindings connect the workshop, form controls, and results to component state.',
      risk: 'Controls and status updates need clear labels and accessible feedback.',
      file: 'app.html',
      path: 'frontend/src/app/app.html',
    },
    {
      id: 'signals',
      icon: 'SIG',
      color: 'amber',
      label: 'Signals',
      subtitle: 'Manage state',
      responsibility:
        'Signals track form values, processing state, results, and six-step progress.',
      risk: 'Inconsistent state updates can leave the display out of sync with user actions.',
      file: 'app.ts',
      path: 'frontend/src/app/app.ts',
    },
    {
      id: 'model',
      icon: 'FX',
      color: 'teal',
      label: 'Model',
      subtitle: 'Calculate outcomes',
      responsibility:
        'A browser-only function models payout outcomes and converts amounts with fixed-point arithmetic.',
      risk: 'Floating-point rounding or invalid input can produce incorrect displayed balances.',
      file: 'simulation.ts',
      path: 'frontend/src/app/simulation.ts',
    },
    {
      id: 'tests',
      icon: 'TEST',
      color: 'green',
      label: 'Tests',
      subtitle: 'Check behavior',
      responsibility:
        'Frontend tests cover simulator scenarios, validation, progress, and UI interactions.',
      risk: 'Untested edge cases can hide incorrect outcomes or regressions.',
      file: 'simulation.spec.ts',
      path: 'frontend/src/app/simulation.spec.ts',
    },
    {
      id: 'deploy',
      icon: 'GH',
      color: 'navy',
      label: 'Pages',
      subtitle: 'Build and publish',
      responsibility:
        'GitHub Actions installs dependencies, runs tests, and publishes the Angular build to Pages.',
      risk: 'An incorrect base path can prevent assets from loading on the published site.',
      file: 'pages.yml',
      path: '.github/workflows/pages.yml',
    },
  ];
  readonly selectedArchitecture = signal(this.architectures[0]);
  readonly menuOpen = signal(false);
  readonly activeSection = signal('overview');
  readonly completedSteps = signal<ReadonlySet<number>>(new Set());
  readonly toast = signal('');
  readonly roundingHint = signal(false);
  readonly progressHint = signal(false);
  readonly status = signal<PayoutStatus>('COMPLETED');
  readonly amount = signal('25.00');
  readonly currency = signal<Currency>('USD');
  readonly validSignature = signal(true);
  readonly duplicate = signal(false);
  readonly processing = signal(false);
  readonly result = signal<SimulationResult | null>(null);
  readonly amountError = computed(() =>
    /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(this.amount()) && /[1-9]/.test(this.amount())
      ? ''
      : 'Enter a positive amount with at most two decimal places (maximum 9,999,999,999.99).',
  );
  readonly nodes = signal([
    { name: 'Input', state: '', label: 'Waiting' },
    { name: 'Signature', state: '', label: 'Waiting' },
    { name: 'Duplicate', state: '', label: 'Waiting' },
    { name: 'Balance', state: '', label: 'Waiting' },
  ]);
  private readonly progressKey = 'payout-angular-workshop-progress-v1';
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private toastTimer?: ReturnType<typeof setTimeout>;
  private simulationTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    afterNextRender(() => {
      this.loadProgress();
      const sections = this.host.nativeElement.querySelectorAll(
        'section[id], article.lab-step[id]',
      );
      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (visible) this.activeSection.set(visible.target.id);
        },
        { rootMargin: '-15% 0px -60%', threshold: [0, 0.05, 0.25] },
      );
      sections.forEach((section) => observer.observe(section));
      const id = window.location.hash.slice(1);
      if (id) {
        this.host.nativeElement.querySelectorAll('[id]').forEach((element) => {
          if (element.id === id) {
            element.scrollIntoView({ behavior: 'instant' });
            this.activeSection.set(id);
          }
        });
      }
      const escapeMenu = (event: KeyboardEvent) => {
        if (event.key === 'Escape') this.closeMenu();
      };
      window.addEventListener('keydown', escapeMenu);
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        window.removeEventListener('keydown', escapeMenu);
      });
    });
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.toastTimer);
      clearTimeout(this.simulationTimer);
      document.body.classList.remove('menu-open');
    });
  }

  toggleStep(step: number) {
    const steps = new Set(this.completedSteps());
    steps.has(step) ? steps.delete(step) : steps.add(step);
    this.completedSteps.set(steps);
    this.saveProgress();
  }

  completeLabel(step: number) {
    return this.completedSteps().has(step) ? '✓ Completed' : '○ Mark complete';
  }

  sourceFileUrl(path: string) {
    return `${this.repoUrl}/blob/${encodeURIComponent(this.sourceRef)}/${path}`;
  }

  resetProgress() {
    this.completedSteps.set(new Set());
    if (this.saveProgress()) this.showToast('Workshop progress reset');
  }

  toggleMenu() {
    this.menuOpen.update((open) => !open);
    document.body.classList.toggle('menu-open', this.menuOpen());
  }

  navigate(section: string) {
    this.activeSection.set(section);
    this.closeMenu();
  }

  private closeMenu() {
    this.menuOpen.set(false);
    document.body.classList.remove('menu-open');
  }

  async copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Copied to clipboard');
    } catch (error) {
      console.error('Unable to copy workshop command', error);
      this.showToast('Clipboard unavailable. Select and copy the command manually.');
    }
  }

  runSimulation() {
    if (this.processing() || this.amountError()) return;
    const delivery = {
      status: this.status(),
      amount: this.amount(),
      currency: this.currency(),
      validSignature: this.validSignature(),
      duplicate: this.duplicate(),
    };
    this.processing.set(true);
    this.result.set(null);
    this.nodes.set([
      { name: 'Input', state: 'active', label: 'Received' },
      { name: 'Signature', state: '', label: 'Waiting' },
      { name: 'Duplicate', state: '', label: 'Waiting' },
      { name: 'Balance', state: '', label: 'Waiting' },
    ]);
    this.simulationTimer = setTimeout(() => {
      this.nodes.update((nodes) =>
        nodes.map((node, index) =>
          index === 0
            ? { ...node, state: 'success', label: 'Accepted' }
            : index === 1
              ? { ...node, state: 'active', label: 'Checking' }
              : node,
        ),
      );
      this.simulationTimer = setTimeout(() => {
        this.result.set(simulateWebhook(delivery));
        this.nodes.set([
          { name: 'Input', state: 'success', label: 'Accepted' },
          {
            name: 'Signature',
            state: delivery.validSignature ? 'success' : 'error',
            label: delivery.validSignature ? 'Valid' : 'Rejected',
          },
          {
            name: 'Duplicate',
            state: !delivery.validSignature ? '' : delivery.duplicate ? 'stopped' : 'success',
            label: !delivery.validSignature
              ? 'Not reached'
              : delivery.duplicate
                ? 'Duplicate'
                : 'New',
          },
          {
            name: 'Balance',
            state:
              !delivery.validSignature || delivery.duplicate
                ? ''
                : delivery.status === 'COMPLETED'
                  ? 'success'
                  : 'stopped',
            label:
              !delivery.validSignature || delivery.duplicate
                ? 'Not reached'
                : delivery.status === 'COMPLETED'
                  ? 'Credited'
                  : 'Ignored',
          },
        ]);
        this.processing.set(false);
      }, 350);
    }, 280);
  }

  private loadProgress() {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(this.progressKey) ?? '[]');
      if (
        !Array.isArray(saved) ||
        !saved.every(
          (step: unknown) =>
            typeof step === 'number' && Number.isInteger(step) && step >= 1 && step <= 6,
        )
      ) {
        throw new Error('Invalid workshop progress');
      }
      this.completedSteps.set(new Set(saved));
    } catch (error) {
      console.error('Unable to restore workshop progress', error);
      this.showToast('Saved progress could not be read. Progress starts empty.');
    }
  }

  private saveProgress() {
    try {
      localStorage.setItem(this.progressKey, JSON.stringify([...this.completedSteps()].sort()));
      return true;
    } catch (error) {
      console.error('Unable to save workshop progress', error);
      this.showToast('Progress works for this visit but could not be saved.');
      return false;
    }
  }

  private showToast(message: string) {
    this.toast.set(message);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 3500);
  }
}
