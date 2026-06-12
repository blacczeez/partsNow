'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCurrency } from '@/lib/utils/format';
import type { EnrichedWalletTransaction } from '@/lib/types/wallet';
import type { OrderStatus } from '@/lib/types/database';
import {
  formatWalletTransactionDetailTime,
  getOrderIdFromTransaction,
  getOrderNumberFromTransaction,
  getWalletTransactionLabel,
  isWalletTransactionCredit,
} from '@/lib/utils/wallet-transactions';

interface WalletTransactionDetailSheetProps {
  transaction: EnrichedWalletTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

export function WalletTransactionDetailSheet({
  transaction,
  isOpen,
  onClose,
}: WalletTransactionDetailSheetProps) {
  if (!transaction) return null;

  const isCredit = isWalletTransactionCredit(transaction.type);
  const orderId = getOrderIdFromTransaction(transaction);
  const orderNumber =
    transaction.order?.order_number ?? getOrderNumberFromTransaction(transaction);
  const label = getWalletTransactionLabel(transaction);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Transaction details">
      <div className="space-y-4">
        <div className="rounded-card bg-slate-50 px-4 py-4 text-center">
          <p className="text-sm text-slate-500">{label}</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              isCredit ? 'text-success' : 'text-slate-900'
            }`}
          >
            {isCredit ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {formatWalletTransactionDetailTime(transaction.created_at)}
          </p>
        </div>

        <div className="divide-y divide-slate-100 rounded-card border border-slate-200 px-4">
          <DetailRow label="Type" value={label} />
          <DetailRow
            label="Balance before"
            value={formatCurrency(transaction.balance_before)}
          />
          <DetailRow
            label="Balance after"
            value={formatCurrency(transaction.balance_after)}
          />
          {orderNumber && <DetailRow label="Order" value={orderNumber} />}
          {transaction.order?.status && (
            <div className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-slate-500">Order status</span>
              <StatusBadge status={transaction.order.status as OrderStatus} />
            </div>
          )}
          {transaction.reference && !orderId && (
            <DetailRow label="Reference" value={transaction.reference} />
          )}
          {transaction.description && transaction.description !== label && (
            <DetailRow label="Note" value={transaction.description} />
          )}
        </div>

        {orderId && (
          <Link href={`/order/${orderId}`} onClick={onClose}>
            <Button variant="secondary" fullWidth>
              View order
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </BottomSheet>
  );
}
