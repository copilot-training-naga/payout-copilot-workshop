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

@Component({
  imports: [FormsModule],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  readonly repoUrl = 'https://github.com/copilot-training-naga/payout-copilot-workshop';
  readonly stepLabels = [
    'Verify environment',
    'Read the spec',
    'Plan the change',
    'Apply guardrails',
    'Build and test',
    'Debug a defect',
  ];
  readonly exploreLinks = [
    { id: 'simulator', icon: '▶', label: 'Webhook simulator' },
    { id: 'architecture', icon: '⌘', label: 'Architecture' },
    { id: 'manual', icon: '›_', label: 'Manual verification' },
    { id: 'troubleshooting', icon: '?', label: 'Troubleshooting' },
  ];
  readonly setupCommand =
    './scripts/verify-env.sh\n./scripts/dev-up.sh\ncurl -s http://localhost:8080/actuator/health';
  readonly planPrompt =
    'We need to implement WebhookController, SignatureVerifier, IdempotencyService, PayoutEventListener, and LedgerService so that WebhookControllerTest passes. Propose the sequence of changes and flag any design risks before writing code.';
  readonly agentPrompt =
    'Implement SignatureVerifier, IdempotencyService, PayoutEventListener, WebhookController, and LedgerService so that every test in WebhookControllerTest passes. Run ./mvnw test after each change and keep iterating until all tests are green. Do not modify the test file.';
  readonly architectures = [
    {
      id: 'controller',
      icon: 'HTTP',
      color: 'blue',
      label: 'Controller',
      subtitle: 'Shape and dispatch',
      responsibility:
        'Reject untrusted requests, parse verified payloads, and publish accepted work.',
      risk: 'Doing ledger or FX work synchronously delays the webhook response.',
      file: 'WebhookController.java',
      path: 'webhook/WebhookController.java',
    },
    {
      id: 'signature',
      icon: 'HMAC',
      color: 'red',
      label: 'Signature',
      subtitle: 'Authenticate body',
      responsibility:
        'Compute HMAC-SHA256 over the exact raw request body and compare digests safely.',
      risk: 'Parsing before verification or using a non-constant-time comparison weakens authentication.',
      file: 'SignatureVerifier.java',
      path: 'webhook/SignatureVerifier.java',
    },
    {
      id: 'redis',
      icon: 'NX',
      color: 'amber',
      label: 'Redis',
      subtitle: 'Claim event ID',
      responsibility:
        'Claim each event ID exactly once with an atomic SET-if-absent operation and TTL.',
      risk: 'A separate read and write allows concurrent deliveries to both enter processing.',
      file: 'IdempotencyService.java',
      path: 'webhook/IdempotencyService.java',
    },
    {
      id: 'event',
      icon: 'ASYNC',
      color: 'teal',
      label: 'Event',
      subtitle: 'Leave request thread',
      responsibility:
        'Move accepted ledger work off the HTTP request thread and process completed payouts.',
      risk: 'Synchronous work can cause webhook sender timeouts and unnecessary redelivery.',
      file: 'PayoutEventListener.java',
      path: 'webhook/PayoutEventListener.java',
    },
    {
      id: 'ledger',
      icon: 'FX',
      color: 'green',
      label: 'Ledger',
      subtitle: 'Convert and credit',
      responsibility:
        'Find the account, convert currency when required, and apply the credit transactionally.',
      risk: 'Floating-point money or missing transaction boundaries can corrupt balance calculations.',
      file: 'LedgerService.java',
      path: 'ledger/LedgerService.java',
    },
    {
      id: 'postgres',
      icon: 'DB',
      color: 'navy',
      label: 'Postgres',
      subtitle: 'Persist balance',
      responsibility:
        'Persist balances and use optimistic versioning to detect conflicting updates.',
      risk: 'Concurrent updates without version checks can silently overwrite a valid balance.',
      file: 'AccountBalance.java',
      path: 'ledger/AccountBalance.java',
    },
  ];
  readonly selectedArchitecture = signal(this.architectures[0]);
  readonly menuOpen = signal(false);
  readonly activeSection = signal('overview');
  readonly completedSteps = signal<ReadonlySet<number>>(new Set());
  readonly toast = signal('');
  readonly signatureHint = signal(false);
  readonly redisHint = signal(false);
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
    { name: 'Request', state: '', label: 'Waiting' },
    { name: 'Signature', state: '', label: 'Waiting' },
    { name: 'Redis', state: '', label: 'Waiting' },
    { name: 'Ledger', state: '', label: 'Waiting' },
  ]);
  private readonly progressKey = 'payout-workshop-progress-v1';
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
      { name: 'Request', state: 'active', label: 'Received' },
      { name: 'Signature', state: '', label: 'Waiting' },
      { name: 'Redis', state: '', label: 'Waiting' },
      { name: 'Ledger', state: '', label: 'Waiting' },
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
          { name: 'Request', state: 'success', label: 'Accepted' },
          {
            name: 'Signature',
            state: delivery.validSignature ? 'success' : 'error',
            label: delivery.validSignature ? 'Verified' : 'Rejected',
          },
          {
            name: 'Redis',
            state: !delivery.validSignature ? '' : delivery.duplicate ? 'stopped' : 'success',
            label: !delivery.validSignature
              ? 'Not reached'
              : delivery.duplicate
                ? 'Duplicate'
                : 'Acquired',
          },
          {
            name: 'Ledger',
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
