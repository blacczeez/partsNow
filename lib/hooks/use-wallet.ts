'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WalletTransaction } from '@/lib/types/database';

interface WalletBalance {
  balance: number;
  heldBalance: number;
  currency: string;
}

interface UseWalletReturn {
  balance: WalletBalance | null;
  transactions: WalletTransaction[];
  isLoadingBalance: boolean;
  isLoadingTransactions: boolean;
  hasMore: boolean;
  refreshBalance: () => Promise<void>;
  loadMoreTransactions: () => void;
}

export function useWallet(): UseWalletReturn {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchBalance = useCallback(async () => {
    setIsLoadingBalance(true);
    try {
      const res = await fetch('/api/wallet/balance');
      if (res.ok) {
        const data = await res.json();
        setBalance(data);
      }
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  const fetchTransactions = useCallback(async (pageNum: number, append: boolean) => {
    setIsLoadingTransactions(true);
    try {
      const res = await fetch(`/api/wallet/transactions?page=${pageNum}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setTransactions((prev) =>
          append ? [...prev, ...data.transactions] : data.transactions
        );
        setTotal(data.pagination.total);
      }
    } finally {
      setIsLoadingTransactions(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    fetchTransactions(1, false);
  }, [fetchBalance, fetchTransactions]);

  const hasMore = transactions.length < total;

  function loadMoreTransactions() {
    if (isLoadingTransactions || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTransactions(nextPage, true);
  }

  return {
    balance,
    transactions,
    isLoadingBalance,
    isLoadingTransactions,
    hasMore,
    refreshBalance: fetchBalance,
    loadMoreTransactions,
  };
}
