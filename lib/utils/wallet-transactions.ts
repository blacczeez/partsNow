import {
  format,
  isToday,
  isYesterday,
  startOfDay,
  differenceInCalendarDays,
} from 'date-fns';
import type { WalletTransaction, WalletTransactionType } from '@/lib/types/database';
import type { EnrichedWalletTransaction } from '@/lib/types/wallet';
import { walletKindToCategory } from '@/lib/utils/wallet-transaction-kind';
import { resolveWalletTransactionKind } from '@/lib/utils/wallet-transaction-kind';

export type WalletTransactionFilter = 'all' | 'topups' | 'orders' | 'refunds';

export type WalletTransactionCategory = 'topup' | 'order' | 'refund' | 'hold' | 'other';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ORDER_NUMBER_REGEX = /ORD-\d{8}-\d{3}/i;

export function isWalletTransactionCredit(type: WalletTransactionType): boolean {
  return type === 'credit' || type === 'release';
}

export function parseOrderNumberFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(ORDER_NUMBER_REGEX);
  return match ? match[0].toUpperCase() : null;
}

export function getOrderIdFromTransaction(
  tx: WalletTransaction | EnrichedWalletTransaction
): string | null {
  if ('order' in tx && tx.order?.id) {
    return tx.order.id;
  }
  if (tx.reference && UUID_REGEX.test(tx.reference)) {
    return tx.reference;
  }
  const metaOrderId = tx.metadata?.order_id;
  if (typeof metaOrderId === 'string' && UUID_REGEX.test(metaOrderId)) {
    return metaOrderId;
  }
  return null;
}

export function getOrderNumberFromTransaction(
  tx: WalletTransaction | EnrichedWalletTransaction
): string | null {
  if ('order' in tx && tx.order?.order_number) {
    return tx.order.order_number;
  }
  const metaOrderNumber = tx.metadata?.order_number;
  if (typeof metaOrderNumber === 'string') return metaOrderNumber;
  return parseOrderNumberFromText(tx.description);
}

export function getWalletTransactionCategory(
  tx: WalletTransaction | EnrichedWalletTransaction
): WalletTransactionCategory {
  return walletKindToCategory(resolveWalletTransactionKind(tx));
}

export function getWalletTransactionLabel(
  tx: WalletTransaction | EnrichedWalletTransaction
): string {
  const category = getWalletTransactionCategory(tx);
  const orderNumber = getOrderNumberFromTransaction(tx);

  switch (category) {
    case 'topup':
      return 'Wallet top-up';
    case 'order':
      return orderNumber ? `Order payment · ${orderNumber}` : 'Order payment';
    case 'refund':
      if (descIncludes(tx, 'partial refund')) {
        return orderNumber ? `Partial refund · ${orderNumber}` : 'Partial refund';
      }
      if (descIncludes(tx, 'cancelled')) {
        return orderNumber
          ? `Order cancellation refund · ${orderNumber}`
          : 'Order cancellation refund';
      }
      return orderNumber ? `Refund · ${orderNumber}` : 'Refund';
    case 'hold':
      return tx.type === 'release' ? 'Hold released' : 'Funds held';
    default:
      if (tx.type === 'credit') return 'Wallet credit';
      if (tx.type === 'debit') return 'Wallet debit';
      return tx.description || tx.type;
  }
}

function descIncludes(tx: WalletTransaction, needle: string): boolean {
  return (tx.description ?? '').toLowerCase().includes(needle);
}

export function getWalletTransactionSubtitle(
  tx: WalletTransaction | EnrichedWalletTransaction
): string | null {
  const category = getWalletTransactionCategory(tx);
  const orderNumber = getOrderNumberFromTransaction(tx);

  if ('order' in tx && tx.order?.status && category === 'order') {
    return formatOrderStatusLabel(tx.order.status);
  }

  if (category === 'topup' && tx.reference?.startsWith('topup_')) {
    return 'Via Paystack';
  }

  if (category === 'order' && orderNumber) {
    return null;
  }

  if (tx.description && tx.description !== getWalletTransactionLabel(tx)) {
    return tx.description;
  }

  return null;
}

export function filterWalletTransactions(
  transactions: Array<WalletTransaction | EnrichedWalletTransaction>,
  filter: WalletTransactionFilter
): Array<WalletTransaction | EnrichedWalletTransaction> {
  if (filter === 'all') return transactions;

  return transactions.filter((tx) => {
    const category = getWalletTransactionCategory(tx);
    switch (filter) {
      case 'topups':
        return category === 'topup';
      case 'orders':
        return category === 'order' || category === 'hold';
      case 'refunds':
        return category === 'refund' || tx.type === 'release';
      default:
        return true;
    }
  });
}

export interface WalletTransactionDateGroup<
  T extends WalletTransaction | EnrichedWalletTransaction = WalletTransaction | EnrichedWalletTransaction,
> {
  label: string;
  transactions: T[];
}

function formatOrderStatusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export function groupWalletTransactionsByDate<
  T extends WalletTransaction | EnrichedWalletTransaction,
>(transactions: T[]): WalletTransactionDateGroup<T>[] {
  const groups = new Map<string, T[]>();

  for (const tx of transactions) {
    const date = new Date(tx.created_at);
    const label = getDateGroupLabel(date);
    const existing = groups.get(label) ?? [];
    existing.push(tx);
    groups.set(label, existing);
  }

  return Array.from(groups.entries()).map(([label, txs]) => ({
    label,
    transactions: txs,
  }));
}

export function getDateGroupLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';

  const daysAgo = differenceInCalendarDays(startOfDay(new Date()), startOfDay(date));
  if (daysAgo < 7) {
    return format(date, 'EEEE');
  }

  return format(date, 'MMMM yyyy');
}

export function formatWalletTransactionListTime(date: string | Date): string {
  const then = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffHours < 24 && isToday(then)) {
    return format(then, 'h:mm a');
  }

  if (isYesterday(then)) {
    return `Yesterday · ${format(then, 'h:mm a')}`;
  }

  const daysAgo = differenceInCalendarDays(startOfDay(now), startOfDay(then));
  if (daysAgo < 7) {
    return format(then, 'EEE · h:mm a');
  }

  return format(then, 'd MMM · h:mm a');
}

export function formatWalletTransactionDetailTime(date: string | Date): string {
  return format(new Date(date), "EEEE, d MMMM yyyy 'at' h:mm a");
}

export const WALLET_TRANSACTION_FILTERS: Array<{
  id: WalletTransactionFilter;
  label: string;
}> = [
  { id: 'all', label: 'All' },
  { id: 'topups', label: 'Top-ups' },
  { id: 'orders', label: 'Orders' },
  { id: 'refunds', label: 'Refunds' },
];
