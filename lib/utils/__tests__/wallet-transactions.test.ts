import { describe, it, expect } from 'vitest';
import type { WalletTransaction } from '@/lib/types/database';
import {
  filterWalletTransactions,
  getOrderIdFromTransaction,
  getWalletTransactionCategory,
  getWalletTransactionLabel,
  groupWalletTransactionsByDate,
  isWalletTransactionCredit,
  parseOrderNumberFromText,
} from '../wallet-transactions';

function tx(partial: Partial<WalletTransaction>): WalletTransaction {
  return {
    id: 'tx-1',
    wallet_id: 'wallet-1',
    type: 'credit',
    amount: 5000,
    balance_before: 0,
    balance_after: 5000,
    reference: null,
    description: null,
    metadata: {},
    created_at: new Date().toISOString(),
    ...partial,
  };
}

describe('wallet transaction display', () => {
  it('labels top-ups', () => {
    const topup = tx({
      type: 'credit',
      description: 'Wallet top-up via Paystack',
      reference: 'topup_user_123',
    });
    expect(getWalletTransactionCategory(topup)).toBe('topup');
    expect(getWalletTransactionLabel(topup)).toBe('Wallet top-up');
  });

  it('labels order payments with order number', () => {
    const payment = tx({
      type: 'debit',
      description: 'Order ORD-20260303-001',
      reference: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(getWalletTransactionCategory(payment)).toBe('order');
    expect(getWalletTransactionLabel(payment)).toBe('Order payment · ORD-20260303-001');
    expect(getOrderIdFromTransaction(payment)).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('prefers metadata.kind when present', () => {
    const payment = tx({
      type: 'credit',
      description: 'Something ambiguous',
      metadata: { kind: 'topup' },
    });
    expect(getWalletTransactionCategory(payment)).toBe('topup');
    expect(getWalletTransactionLabel(payment)).toBe('Wallet top-up');
  });

  it('labels refunds', () => {
    const refund = tx({
      type: 'credit',
      description: 'Refund for cancelled order ORD-20260303-002',
      reference: '550e8400-e29b-41d4-a716-446655440001',
    });
    expect(getWalletTransactionCategory(refund)).toBe('refund');
    expect(getWalletTransactionLabel(refund)).toBe(
      'Order cancellation refund · ORD-20260303-002'
    );
  });

  it('parses order numbers from text', () => {
    expect(parseOrderNumberFromText('Order ORD-20240115-007')).toBe('ORD-20240115-007');
    expect(parseOrderNumberFromText('no order here')).toBeNull();
  });

  it('filters by category', () => {
    const transactions = [
      tx({ id: '1', description: 'Wallet top-up via Paystack', reference: 'topup_x' }),
      tx({ id: '2', type: 'debit', description: 'Order ORD-20260303-001' }),
      tx({ id: '3', description: 'Refund for cancelled order ORD-20260303-002' }),
    ];

    expect(filterWalletTransactions(transactions, 'topups')).toHaveLength(1);
    expect(filterWalletTransactions(transactions, 'orders')).toHaveLength(1);
    expect(filterWalletTransactions(transactions, 'refunds')).toHaveLength(1);
  });

  it('groups transactions by date label', () => {
    const today = new Date();
    const groups = groupWalletTransactionsByDate([
      tx({ id: '1', created_at: today.toISOString() }),
      tx({ id: '2', created_at: today.toISOString() }),
    ]);
    expect(groups[0].label).toBe('Today');
    expect(groups[0].transactions).toHaveLength(2);
  });

  it('treats credit and release as inflows', () => {
    expect(isWalletTransactionCredit('credit')).toBe(true);
    expect(isWalletTransactionCredit('release')).toBe(true);
    expect(isWalletTransactionCredit('debit')).toBe(false);
  });
});
