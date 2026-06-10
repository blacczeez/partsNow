'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdminUrlState } from '@/lib/hooks/use-admin-url-state';
import type { OrderStatus } from '@/lib/types/database';

interface Filters {
  page: number;
  status?: OrderStatus;
  search?: string;
  priceReview?: 'pending';
}

interface AdminOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  customer_id: string;
  customer_name: string;
  source_channel: string;
  price_review_status: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function buildAdminOrdersParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams({ page: String(filters.page), limit: '20' });
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  if (filters.priceReview === 'pending') params.set('priceReview', 'pending');
  return params;
}

export function useAdminOrders() {
  const { values, setUrlState } = useAdminUrlState(['status', 'search', 'priceReview']);
  const page = parseInt(values.page || '1', 10);

  const filters: Filters = useMemo(
    () => ({
      page,
      status: (values.status as OrderStatus) || undefined,
      search: values.search || undefined,
      priceReview: values.priceReview === 'pending' ? 'pending' : undefined,
    }),
    [page, values.status, values.search, values.priceReview]
  );

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const setFilters = useCallback(
    (value: Filters | ((prev: Filters) => Filters)) => {
      setIsLoading(true);
      const next = typeof value === 'function' ? value(filters) : value;
      setUrlState({
        page: next.page,
        status: next.status || undefined,
        search: next.search || undefined,
        priceReview: next.priceReview === 'pending' ? 'pending' : undefined,
      });
    },
    [filters, setUrlState]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const res = await fetch(`/api/admin/orders?${buildAdminOrdersParams(filters)}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setOrders(data.orders);
          setPagination(data.pagination);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-orders-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          void (async () => {
            const res = await fetch(`/api/admin/orders?${buildAdminOrdersParams(filters)}`);
            if (res.ok) {
              const data = await res.json();
              setOrders(data.orders);
              setPagination(data.pagination);
            }
          })();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters]);

  return { orders, pagination, isLoading, filters, setFilters };
}
