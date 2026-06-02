'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Wallet as WalletIcon,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { TopUpForm } from '@/components/forms/topup-form';
import { useWallet } from '@/lib/hooks/use-wallet';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { toast } from '@/components/ui/toast';
import type { WalletTransaction } from '@/lib/types/database';

function TransactionItem({ tx }: { tx: WalletTransaction }) {
  const isCredit = tx.type === 'credit' || tx.type === 'release';

  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isCredit ? 'bg-green-100' : 'bg-red-100'
        }`}
      >
        {isCredit ? (
          <ArrowDownLeft className="h-4 w-4 text-success" />
        ) : (
          <ArrowUpRight className="h-4 w-4 text-error" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">
          {tx.description || tx.type}
        </p>
        <p className="text-xs text-slate-400">
          {formatRelativeTime(tx.created_at)}
        </p>
      </div>
      <p
        className={`text-sm font-semibold ${
          isCredit ? 'text-success' : 'text-slate-900'
        }`}
      >
        {isCredit ? '+' : '-'}
        {formatCurrency(tx.amount)}
      </p>
    </div>
  );
}

function WalletContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const {
    balance,
    transactions,
    isLoadingBalance,
    isLoadingTransactions,
    hasMore,
    refreshBalance,
    loadMoreTransactions,
  } = useWallet();

  const [showTopUp, setShowTopUp] = useState(false);
  const [isTopUpSubmitting, setIsTopUpSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Handle Paystack return
  useEffect(() => {
    if (!reference) return;

    async function verify() {
      setVerifying(true);
      try {
        const res = await fetch('/api/wallet/topup/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        });
        const data = await res.json();
        if (data.success) {
          toast('success', `Top-up successful! ${data.amount ? formatCurrency(data.amount) + ' added' : ''}`);
          refreshBalance();
        } else {
          toast('error', 'Payment verification failed');
        }
      } catch {
        toast('error', 'Failed to verify payment');
      } finally {
        setVerifying(false);
        // Clean URL
        window.history.replaceState({}, '', '/wallet');
      }
    }

    verify();
  }, [reference, refreshBalance]);

  async function handleTopUp(amount: number) {
    setIsTopUpSubmitting(true);
    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast('error', data.error || 'Top-up failed');
        return;
      }

      // Redirect to Paystack
      window.location.href = data.authorizationUrl;
    } catch {
      toast('error', 'Failed to initiate top-up');
    } finally {
      setIsTopUpSubmitting(false);
    }
  }

  return (
    <div>
      {/* Balance Card */}
      <div className="bg-primary px-4 pb-8 pt-6 lg:rounded-b-2xl">
        <h1 className="mb-4 text-xl font-bold text-white">Wallet</h1>
        <div className="rounded-card bg-white/10 px-5 py-5">
          {isLoadingBalance || verifying ? (
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          ) : (
            <>
              <p className="text-sm text-blue-200">Available Balance</p>
              <p className="mt-1 text-3xl font-bold text-white">
                {formatCurrency(balance?.balance ?? 0)}
              </p>
              {(balance?.heldBalance ?? 0) > 0 && (
                <p className="mt-1 text-xs text-blue-200">
                  {formatCurrency(balance!.heldBalance)} held for pending orders
                </p>
              )}
            </>
          )}
        </div>
        <Button
          variant="secondary"
          fullWidth
          className="mt-4"
          onClick={() => setShowTopUp(true)}
        >
          <Plus className="mr-2 h-5 w-5" />
          Top Up Wallet
        </Button>
      </div>

      {/* Transaction History */}
      <div className="px-4 py-4">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Transaction History
        </h2>

        {isLoadingTransactions && transactions.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <Clock className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">No transactions yet</p>
            <p className="text-xs text-slate-400">
              Top up your wallet to get started
            </p>
          </div>
        ) : (
          <div className="rounded-card border border-slate-200 bg-white px-4">
            {transactions.map((tx) => (
              <TransactionItem key={tx.id} tx={tx} />
            ))}
          </div>
        )}

        {hasMore && (
          <button
            type="button"
            onClick={loadMoreTransactions}
            disabled={isLoadingTransactions}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-card border border-slate-200 bg-white py-3 text-sm font-medium text-primary hover:bg-slate-50"
          >
            {isLoadingTransactions ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Load more'
            )}
          </button>
        )}
      </div>

      {/* Top Up Sheet */}
      <BottomSheet
        isOpen={showTopUp}
        onClose={() => setShowTopUp(false)}
        title="Top Up Wallet"
      >
        <TopUpForm onSubmit={handleTopUp} isSubmitting={isTopUpSubmitting} />
      </BottomSheet>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <WalletContent />
    </Suspense>
  );
}
