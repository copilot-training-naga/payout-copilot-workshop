import { Delivery, simulateWebhook } from './simulation';

const delivery: Delivery = {
  amount: '25.00',
  currency: 'USD',
  status: 'COMPLETED',
  validSignature: true,
  duplicate: false,
};

describe('webhook educational model', () => {
  it('rejects invalid signatures before deduplication or ledger work', () => {
    expect(simulateWebhook({ ...delivery, validSignature: false, duplicate: true })).toMatchObject({
      status: '401 Unauthorized',
      idempotency: 'Not checked',
      ledger: 'Not applied',
      balance: '100.0000 unchanged',
    });
  });

  it('credits a completed payout using exact decimal arithmetic', () => {
    expect(simulateWebhook(delivery)).toMatchObject({
      signature: 'Valid',
      idempotency: 'New delivery',
      balance: '100.0000 → 125.0000 USD',
    });
    expect(simulateWebhook({ ...delivery, amount: '0.01' }).balance).toBe(
      '100.0000 → 100.0100 USD',
    );
  });

  it.each(['PENDING', 'FAILED'] as const)('does not credit %s payouts', (status) => {
    expect(simulateWebhook({ ...delivery, status })).toMatchObject({
      status: '200 OK',
      ledger: `Skipped for ${status}`,
      balance: '100.0000 unchanged',
    });
  });

  it('leaves the already processed balance unchanged for a duplicate', () => {
    expect(simulateWebhook({ ...delivery, duplicate: true })).toMatchObject({
      idempotency: 'Duplicate stopped',
      ledger: 'Skipped',
      balance: '125.0000 USD unchanged',
    });
    expect(simulateWebhook({ ...delivery, amount: '50.00', duplicate: true }).balance).toBe(
      '150.0000 USD unchanged',
    );
    expect(simulateWebhook({ ...delivery, status: 'FAILED', duplicate: true }).balance).toBe(
      '100.0000 USD unchanged',
    );
  });

  it.each([
    ['EUR', '127.1739'],
    ['GBP', '131.6456'],
  ] as const)('converts %s with illustrative FX and four-decimal rounding', (currency, balance) => {
    expect(simulateWebhook({ ...delivery, currency }).balance).toBe(`100.0000 → ${balance} USD`);
  });

  it.each(['', '0', '-1', 'NaN', 'Infinity', '0.001', '1e10', '10000000000'])(
    'rejects invalid amount %s',
    (amount) => {
      expect(() => simulateWebhook({ ...delivery, amount })).toThrow('Amount must be positive');
    },
  );
});
