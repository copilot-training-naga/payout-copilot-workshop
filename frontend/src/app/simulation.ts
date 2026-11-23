export type Currency = 'USD' | 'EUR' | 'GBP';
export type PayoutStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface Delivery {
  status: PayoutStatus;
  amount: string;
  currency: Currency;
  validSignature: boolean;
  duplicate: boolean;
}

export interface SimulationResult {
  status: string;
  signature: string;
  idempotency: string;
  ledger: string;
  balance: string;
  tone: 'good' | 'bad';
}

function formatBalance(units: bigint): string {
  return `${units / 10000n}.${(units % 10000n).toString().padStart(4, '0')}`;
}

export function simulateWebhook(delivery: Delivery): SimulationResult {
  if (
    !/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(delivery.amount) ||
    !/[1-9]/.test(delivery.amount)
  ) {
    throw new Error('Amount must be positive and have at most two decimal places.');
  }
  if (!delivery.validSignature) {
    return {
      status: '401 Unauthorized',
      signature: 'Invalid',
      idempotency: 'Not checked',
      ledger: 'Not published',
      balance: '100.0000 unchanged',
      tone: 'bad',
    };
  }
  const [whole, fraction = ''] = delivery.amount.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  // Illustrative FX rates from the reference model, not live quotes.
  const rate = { USD: 100n, EUR: 92n, GBP: 79n }[delivery.currency];
  const credit = (cents * 10000n + rate / 2n) / rate;
  const creditedBalance = `${formatBalance(1000000n + credit)} USD`;
  if (delivery.duplicate) {
    return {
      status: '200 OK',
      signature: 'Verified',
      idempotency: 'Duplicate stopped',
      ledger: 'Skipped',
      balance: `${delivery.status === 'COMPLETED' ? creditedBalance : '100.0000 USD'} unchanged`,
      tone: 'good',
    };
  }
  return {
    status: '200 OK',
    signature: 'Verified',
    idempotency: 'Key acquired',
    ledger:
      delivery.status === 'COMPLETED'
        ? `${whole}.${fraction.padEnd(2, '0')} ${delivery.currency} credited`
        : `Skipped for ${delivery.status}`,
    balance:
      delivery.status === 'COMPLETED' ? `100.0000 → ${creditedBalance}` : '100.0000 unchanged',
    tone: 'good',
  };
}
