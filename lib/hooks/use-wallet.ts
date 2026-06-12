'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EnrichedWalletTransaction, WalletTransactionSummary } from '@/lib/types/wallet';
import type { WalletTransactionFilter } from '@/lib/utils/wallet-transactions';

interface WalletBalance {
  balance: number;
  heldBalance: number;
  currency: string;
}

interface UseWalletReturn {
  balance: WalletBalance | null;
  transactions: EnrichedWalletTransaction[];
  summary: WalletTransactionSummary | null;
  filter: WalletTransactionFilter;
  setFilter: (filter: WalletTransactionFilter) => void;
  isLoadingBalance: boolean;
  isLoadingTransactions: boolean;
  hasMore: boolean;
  refreshBalance: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  loadMoreTransactions: () => void;
}

async function fetchWalletBalance() {
  const res = await fetch('/api/wallet/balance');
  if (res.ok) {
    return res.json() as Promise<WalletBalance>;
  }
  return null;
}

async function fetchWalletTransactionsPage(
  pageNum: number,
  activeFilter: WalletTransactionFilter
) {
  const params = new URLSearchParams({
    page: String(pageNum),
    limit: '10',
    filter: activeFilter,
  });
  const res = await fetch(`/api/wallet/transactions?${params}`);
  if (res.ok) {
    return res.json() as Promise<{
      transactions: EnrichedWalletTransaction[];
      pagination: { total: number };
      summary: WalletTransactionSummary | null;
    }>;
  }
  return null;
}

export function useWallet(): UseWalletReturn {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<EnrichedWalletTransaction[]>([]);
  const [summary, setSummary] = useState<WalletTransactionSummary | null>(null);
  const [filter, setFilterState] = useState<WalletTransactionFilter>('all');
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadBalance() {
      try {
        const data = await fetchWalletBalance();
        if (!cancelled && data) {
          setBalance(data);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingBalance(false);
        }
      }
    }

    void loadBalance();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      try {
        const data = await fetchWalletTransactionsPage(page, filter);
        if (!cancelled && data) {
          setTransactions((prev) =>
            page === 1 ? data.transactions : [...prev, ...data.transactions]
          );
          setTotal(data.pagination.total);
          setSummary(data.summary ?? null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTransactions(false);
        }
      }
    }

    void loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [page, filter]);

  const hasMore = transactions.length < total;

  const refreshBalance = useCallback(async () => {
    setIsLoadingBalance(true);
    try {
      const data = await fetchWalletBalance();
      if (data) {
        setBalance(data);
      }
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  const refreshTransactions = useCallback(async () => {
    setIsLoadingTransactions(true);
    try {
      const data = await fetchWalletTransactionsPage(1, filter);
      if (data) {
        setTransactions(data.transactions);
        setTotal(data.pagination.total);
        setSummary(data.summary ?? null);
        setPage(1);
      }
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [filter]);

  const setFilter = useCallback((nextFilter: WalletTransactionFilter) => {
    setIsLoadingTransactions(true);
    setPage(1);
    setFilterState(nextFilter);
  }, []);

  function loadMoreTransactions() {
    if (isLoadingTransactions || !hasMore) return;
    setIsLoadingTransactions(true);
    setPage((current) => current + 1);
  }

  return {
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
  };
}
