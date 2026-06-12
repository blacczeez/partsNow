import type { OrderStatus, WalletTransaction } from '@/lib/types/database';
import type { WalletTransactionFilter } from '@/lib/utils/wallet-transactions';

export type WalletTransactionKind =
  | 'topup'
  | 'order_payment'
  | 'refund'
  | 'partial_refund'
  | 'price_adjustment'
  | 'hold'
  | 'release'
  | 'other';

export type WalletTransactionSource =
  | 'paystack'
  | 'order'
  | 'refund'
  | 'admin'
  | 'settlement'
  | 'price_review';

export interface WalletTransactionMetadata {
  kind?: WalletTransactionKind;
  source?: WalletTransactionSource;
  order_id?: string;
  order_number?: string;
}

export interface WalletTransactionOrderLink {
  id: string;
  order_number: string;
  status: OrderStatus;
}

export interface EnrichedWalletTransaction extends WalletTransaction {
  kind: WalletTransactionKind;
  order: WalletTransactionOrderLink | null;
}

export interface WalletTransactionSummary {
  moneyIn: number;
  moneyOut: number;
  periodLabel: string;
  filter: WalletTransactionFilter;
}

export interface WalletLedgerOptions {
  metadata?: WalletTransactionMetadata;
}
