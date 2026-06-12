'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { TopUpForm } from '@/components/forms/topup-form';
import { WalletTransactionHistory } from '@/components/wallet/wallet-transaction-history';
import { useWallet } from '@/lib/hooks/use-wallet';
import { formatCurrency } from '@/lib/utils/format';
import { toast } from '@/components/ui/toast';

function WalletContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const {
    balance,
    transactions,
    summary,
    filter,
    setFilter,
    isLoadingBalance,
    isLoadingTransactions,
    hasMore,
    refreshBalance,
    refreshTransactions,
    loadMoreTransactions,
  } = useWallet();

  const [showTopUp, setShowTopUp] = useState(false);
  const [isTopUpSubmitting, setIsTopUpSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);

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
          toast(
            'success',
            `Top-up successful! ${data.amount ? formatCurrency(data.amount) + ' added' : ''}`
          );
          await Promise.all([refreshBalance(), refreshTransactions()]);
        } else {
          toast('error', 'Payment verification failed');
        }
      } catch {
        toast('error', 'Failed to verify payment');
      } finally {
        setVerifying(false);
        window.history.replaceState({}, '', '/wallet');
      }
    }

    verify();
  }, [reference, refreshBalance, refreshTransactions]);

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

      window.location.href = data.authorizationUrl;
    } catch {
      toast('error', 'Failed to initiate top-up');
    } finally {
      setIsTopUpSubmitting(false);
    }
  }

  return (
    <div>
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

      <div className="px-4 py-4">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Transaction History
        </h2>

        <WalletTransactionHistory
          transactions={transactions}
          summary={summary}
          filter={filter}
          onFilterChange={setFilter}
          isLoading={isLoadingTransactions}
          hasMore={hasMore}
          onLoadMore={loadMoreTransactions}
        />
      </div>

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
