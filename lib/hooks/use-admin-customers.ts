'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminUrlState } from '@/lib/hooks/use-admin-url-state';

interface AdminCustomer {
  id: string;
  full_name: string;
  phone: string;
  user_type: string;
  loyalty_tier: string;
  total_orders: number;
  lifetime_spend: number;
  wallet_balance: number;
  is_active: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useAdminCustomers() {
  const { values, setUrlState } = useAdminUrlState(['search', 'tier']);
  const page = parseInt(values.page || '1', 10);
  const search = values.search;
  const tier = values.tier;

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const setPage = useCallback(
    (value: number) => {
      setIsLoading(true);
      setUrlState({ page: value });
    },
    [setUrlState]
  );

  const setSearch = useCallback(
    (value: string) => {
      setIsLoading(true);
      setUrlState({ search: value || undefined, page: 1 });
    },
    [setUrlState]
  );

  const setTier = useCallback(
    (value: string) => {
      setIsLoading(true);
      setUrlState({ tier: value || undefined, page: 1 });
    },
    [setUrlState]
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchCustomers() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (search) params.set('search', search);
        if (tier) params.set('tier', tier);

        const res = await fetch(`/api/admin/customers?${params}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setCustomers(data.customers);
          setPagination(data.pagination);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchCustomers();
    return () => {
      cancelled = true;
    };
  }, [page, search, tier]);

  return { customers, pagination, isLoading, page, setPage, search, setSearch, tier, setTier };
}
