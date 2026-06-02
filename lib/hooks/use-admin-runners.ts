'use client';

import { useState, useEffect, useCallback } from 'react';

interface AdminRunner {
  id: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  float_balance: number;
  on_shift: boolean;
  today_commission: number;
  active_orders: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useAdminRunners() {
  const [runners, setRunners] = useState<AdminRunner[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchRunners = useCallback(async (p: number, s: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (s) params.set('search', s);

      const res = await fetch(`/api/admin/runners?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRunners(data.runners);
        setPagination(data.pagination);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRunners(page, search);
  }, [page, search, fetchRunners]);

  return { runners, pagination, isLoading, page, setPage, search, setSearch, refresh: () => fetchRunners(page, search) };
}
