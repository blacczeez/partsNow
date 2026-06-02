'use client';

import { useState, useEffect, useCallback } from 'react';

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
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomers = useCallback(async (p: number, s: string, t: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (s) params.set('search', s);
      if (t) params.set('tier', t);

      const res = await fetch(`/api/admin/customers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers);
        setPagination(data.pagination);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers(page, search, tier);
  }, [page, search, tier, fetchCustomers]);

  return { customers, pagination, isLoading, page, setPage, search, setSearch, tier, setTier };
}
