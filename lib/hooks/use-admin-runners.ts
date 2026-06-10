'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

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

function buildRunnersParams(page: number, search: string): URLSearchParams {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.set('search', search);
  return params;
}

export function useAdminRunners() {
  const [runners, setRunners] = useState<AdminRunner[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [page, setPageState] = useState(1);
  const [search, setSearchState] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const setPage = useCallback((value: number | ((prev: number) => number)) => {
    setIsLoading(true);
    setPageState(value);
  }, []);

  const setSearch = useCallback((value: string | ((prev: string) => string)) => {
    setIsLoading(true);
    setSearchState(value);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRunners() {
      try {
        const res = await fetch(`/api/admin/runners?${buildRunnersParams(page, search)}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setRunners(data.runners);
          setPagination(data.pagination);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRunners();

    return () => {
      cancelled = true;
    };
  }, [page, search]);

  // Refresh when assignments or shifts change (e.g. new order assigned to runner)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-runners-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_assignments' },
        () => {
          void (async () => {
            const res = await fetch(`/api/admin/runners?${buildRunnersParams(page, search)}`);
            if (res.ok) {
              const data = await res.json();
              setRunners(data.runners);
              setPagination(data.pagination);
            }
          })();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'runner_shifts' },
        () => {
          void (async () => {
            const res = await fetch(`/api/admin/runners?${buildRunnersParams(page, search)}`);
            if (res.ok) {
              const data = await res.json();
              setRunners(data.runners);
              setPagination(data.pagination);
            }
          })();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [page, search]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/runners?${buildRunnersParams(page, search)}`);
      if (res.ok) {
        const data = await res.json();
        setRunners(data.runners);
        setPagination(data.pagination);
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  return { runners, pagination, isLoading, page, setPage, search, setSearch, refresh };
}
