import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { vi } from 'vitest';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('tracks completion through the rendered button and persists it', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    host.querySelector<HTMLButtonElement>('#step-1 .complete-button')!.click();
    await fixture.whenStable();
    expect(host.querySelector('.progress-compact')?.textContent).toContain('1 of 6 complete');
    expect(host.querySelector('#step-1')?.classList.contains('completed')).toBe(true);
    expect(JSON.parse(localStorage.getItem('payout-workshop-progress-v1')!)).toEqual([1]);
    host.querySelector<HTMLButtonElement>('#step-1 .complete-button')!.click();
    await fixture.whenStable();
    expect(host.querySelector('#step-1 .complete-button')?.getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('restores progress and resets all steps', async () => {
    localStorage.setItem('payout-workshop-progress-v1', '[1,3,6]');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.componentInstance.completedSteps().size).toBe(3);
    fixture.componentInstance.resetProgress();
    expect(localStorage.getItem('payout-workshop-progress-v1')).toBe('[]');
  });

  it('reports corrupted progress instead of breaking the page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('payout-workshop-progress-v1', '{"invalid":true}');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.componentInstance.completedSteps().size).toBe(0);
    expect(fixture.componentInstance.toast()).toContain('could not be read');
  });

  it('switches architecture details and keeps owner links in this repository', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    host.querySelectorAll<HTMLButtonElement>('.architecture-node')[2].click();
    await fixture.whenStable();
    expect(host.querySelector('.architecture-detail')?.textContent).toContain(
      'atomic SET-if-absent',
    );
    expect(host.querySelector<HTMLAnchorElement>('.architecture-detail a')?.href).toContain(
      'copilot-training-naga/payout-copilot-workshop/blob/main/',
    );
  });

  it('blocks invalid simulator amounts and renders the valid delivery result', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;
    app.amount.set('-1');
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector<HTMLButtonElement>('.simulator-button')?.disabled).toBe(true);
    app.runSimulation();
    expect(app.processing()).toBe(false);
    app.amount.set('25.00');
    app.runSimulation();
    expect(app.processing()).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    await fixture.whenStable();
    expect(host.querySelector('.result-grid')?.textContent).toContain('125.0000 USD');
    expect(app.processing()).toBe(false);
  });

  it('makes clipboard failure visible instead of claiming success', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('navigator', {
      userAgent: navigator.userAgent,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) },
    });
    const fixture = TestBed.createComponent(App);
    await fixture.componentInstance.copyText('./mvnw test');
    expect(fixture.componentInstance.toast()).toContain('Clipboard unavailable');
  });
});
