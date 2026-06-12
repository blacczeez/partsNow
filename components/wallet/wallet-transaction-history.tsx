'use client';

import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
  RotateCcw,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';
import type { EnrichedWalletTransaction, WalletTransactionSummary } from '@/lib/types/wallet';
import {
  formatWalletTransactionListTime,
  getWalletTransactionCategory,
  getWalletTransactionLabel,
  getWalletTransactionSubtitle,
  groupWalletTransactionsByDate,
  isWalletTransactionCredit,
  WALLET_TRANSACTION_FILTERS,
  type WalletTransactionFilter,
} from '@/lib/utils/wallet-transactions';
import { WalletTransactionDetailSheet } from './wallet-transaction-detail-sheet';

interface WalletTransactionHistoryProps {
  transactions: EnrichedWalletTransaction[];
  summary: WalletTransactionSummary | null;
  filter: WalletTransactionFilter;
  onFilterChange: (filter: WalletTransactionFilter) => void;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

function TransactionIcon({ tx }: { tx: EnrichedWalletTransaction }) {
  const category = getWalletTransactionCategory(tx);
  const isCredit = isWalletTransactionCredit(tx.type);

  const iconClass = cn(
    'h-4 w-4',
    isCredit ? 'text-success' : tx.type === 'hold' ? 'text-amber-600' : 'text-error'
  );

  const bgClass = cn(
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
    isCredit ? 'bg-green-100' : tx.type === 'hold' ? 'bg-amber-100' : 'bg-red-100'
  );

  let Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
  if (category === 'topup') Icon = Wallet;
  if (category === 'order') Icon = ShoppingBag;
  if (category === 'refund') Icon = RotateCcw;
  if (category === 'hold') Icon = Lock;

  return (
    <div className={bgClass}>
      <Icon className={iconClass} />
    </div>
  );
}

function TransactionRow({
  tx,
  onSelect,
}: {
  tx: EnrichedWalletTransaction;
  onSelect: (tx: EnrichedWalletTransaction) => void;
}) {
  const isCredit = isWalletTransactionCredit(tx.type);
  const label = getWalletTransactionLabel(tx);
  const subtitle = getWalletTransactionSubtitle(tx);

  return (
    <button
      type="button"
      onClick={() => onSelect(tx)}
      className="flex w-full items-center gap-3 border-b border-slate-100 py-3 text-left last:border-0 hover:bg-slate-50/80"
    >
      <TransactionIcon tx={tx} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{label}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {formatWalletTransactionListTime(tx.created_at)}
          {subtitle ? ` · ${subtitle}` : ''}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Balance {formatCurrency(tx.balance_after)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <p
          className={cn(
            'text-sm font-semibold',
            isCredit ? 'text-success' : 'text-slate-900'
          )}
        >
          {isCredit ? '+' : '-'}
          {formatCurrency(tx.amount)}
        </p>
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </div>
    </button>
  );
}

function SummaryStrip({ summary }: { summary: WalletTransactionSummary }) {
  const filterLabel =
    summary.filter === 'all'
      ? 'This month'
      : `${summary.periodLabel} · ${WALLET_TRANSACTION_FILTERS.find((f) => f.id === summary.filter)?.label ?? summary.filter}`;

  return (
    <div className="mb-4 rounded-card border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {filterLabel}
      </p>
      <div className="mt-2 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">Money in</p>
          <p className="text-sm font-semibold text-success">
            +{formatCurrency(summary.moneyIn)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Money out</p>
          <p className="text-sm font-semibold text-slate-900">
            -{formatCurrency(summary.moneyOut)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function WalletTransactionHistory({
  transactions,
  summary,
  filter,
  onFilterChange,
  isLoading,
  hasMore,
  onLoadMore,
}: WalletTransactionHistoryProps) {
  const [selectedTx, setSelectedTx] = useState<EnrichedWalletTransaction | null>(null);
  const groups = groupWalletTransactionsByDate(transactions);

  return (
    <>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {WALLET_TRANSACTION_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onFilterChange(id)}
            disabled={isLoading && filter === id}
            className={cn(
              'shrink-0 rounded-pill px-3 py-1.5 text-sm font-medium transition-colors',
              filter === id
                ? 'bg-primary text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {summary && <SummaryStrip summary={summary} />}

      {isLoading && transactions.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-slate-200 bg-white py-12">
          <Clock className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">No transactions in this category</p>
          <p className="text-xs text-slate-400">Try another filter or top up your wallet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {group.label}
              </h3>
              <div className="rounded-card border border-slate-200 bg-white px-4">
                {group.transactions.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} onSelect={setSelectedTx} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isLoading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-card border border-slate-200 bg-white py-3 text-sm font-medium text-primary hover:bg-slate-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Load more'
          )}
        </button>
      )}

      <WalletTransactionDetailSheet
        transaction={selectedTx}
        isOpen={selectedTx != null}
        onClose={() => setSelectedTx(null)}
      />
    </>
  );
}
