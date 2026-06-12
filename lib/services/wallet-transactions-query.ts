import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EnrichedWalletTransaction,
  WalletTransactionSummary,
} from '@/lib/types/wallet';
import type { WalletTransaction } from '@/lib/types/database';
import type { OrderStatus } from '@/lib/types/database';
import {
  getOrderIdFromTransaction,
  type WalletTransactionFilter,
} from '@/lib/utils/wallet-transactions';
import { resolveWalletTransactionKind } from '@/lib/utils/wallet-transaction-kind';
import { format } from 'date-fns';

export function applyWalletTransactionFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filter: WalletTransactionFilter
) {
  if (filter === 'all') return query;

  if (filter === 'topups') {
    return query.or(
      'metadata->>kind.eq.topup,reference.like.topup_%,description.ilike.%top-up%,description.ilike.%topup%'
    );
  }

  if (filter === 'orders') {
    return query.or(
      'metadata->>kind.eq.order_payment,type.eq.hold,type.eq.release,and(type.eq.debit,description.ilike.%Order%)'
    );
  }

  if (filter === 'refunds') {
    return query.or(
      'metadata->>kind.eq.refund,metadata->>kind.eq.partial_refund,type.eq.release,and(type.eq.credit,description.ilike.%refund%)'
    );
  }

  return query;
}

export async function enrichWalletTransactions(
  supabase: SupabaseClient,
  transactions: WalletTransaction[]
): Promise<EnrichedWalletTransaction[]> {
  if (transactions.length === 0) return [];

  const orderIds = new Set<string>();
  for (const tx of transactions) {
    const orderId = getOrderIdFromTransaction(tx);
    if (orderId) orderIds.add(orderId);
    const metaOrderId = tx.metadata?.order_id;
    if (typeof metaOrderId === 'string') orderIds.add(metaOrderId);
  }

  const orderMap: Record<
    string,
    { id: string; order_number: string; status: OrderStatus }
  > = {};

  if (orderIds.size > 0) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, status')
      .in('id', [...orderIds]);

    for (const order of orders ?? []) {
      orderMap[order.id as string] = {
        id: order.id as string,
        order_number: order.order_number as string,
        status: order.status as OrderStatus,
      };
    }
  }

  return transactions.map((tx) => {
    const orderId =
      getOrderIdFromTransaction(tx) ??
      (typeof tx.metadata?.order_id === 'string' ? tx.metadata.order_id : null);
    const metaOrderNumber =
      typeof tx.metadata?.order_number === 'string' ? tx.metadata.order_number : null;

    const linkedOrder = orderId ? orderMap[orderId] ?? null : null;
    const order =
      linkedOrder ??
      (metaOrderNumber && orderId
        ? { id: orderId, order_number: metaOrderNumber, status: 'pending' as OrderStatus }
        : null);

    return {
      ...tx,
      kind: resolveWalletTransactionKind(tx),
      order,
    };
  });
}

export async function getWalletTransactionSummary(
  supabase: SupabaseClient,
  walletId: string,
  filter: WalletTransactionFilter
): Promise<WalletTransactionSummary> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const filteredQuery = applyWalletTransactionFilter(
    supabase
      .from('wallet_transactions')
      .select('type, amount')
      .eq('wallet_id', walletId)
      .gte('created_at', startOfMonth.toISOString()),
    filter
  );

  const { data, error } = await filteredQuery;
  if (error) throw new Error(error.message);

  let moneyIn = 0;
  let moneyOut = 0;

  for (const row of data ?? []) {
    const type = row.type as string;
    const amount = Number(row.amount);
    if (type === 'credit' || type === 'release') {
      moneyIn += amount;
    } else if (type === 'debit' || type === 'hold') {
      moneyOut += amount;
    }
  }

  return {
    moneyIn,
    moneyOut,
    periodLabel: format(startOfMonth, 'MMMM yyyy'),
    filter,
  };
}
