'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdminUrlState } from '@/lib/hooks/use-admin-url-state';
import {
  ATTENTION_LABELS,
  ATTENTION_TYPES,
  type AttentionType,
} from '@/lib/constants/admin-attention';
import type { OrderStatus } from '@/lib/types/database';

interface Filters {
  page: number;
  status?: OrderStatus;
  search?: string;
  priceReview?: 'pending';
  attention?: AttentionType;
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
  minutes_overdue?: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function parseAttention(value: string | undefined): AttentionType | undefined {
  if (!value) return undefined;
  return ATTENTION_TYPES.includes(value as AttentionType)
    ? (value as AttentionType)
    : undefined;
}

function buildAdminOrdersParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams({ page: String(filters.page), limit: '20' });
  if (filters.attention) {
    params.set('attention', filters.attention);
  } else {
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (filters.priceReview === 'pending') params.set('priceReview', 'pending');
  }
  return params;
}

const REALTIME_DEBOUNCE_MS = 3000;

export function useAdminOrders() {
  const { values, setUrlState } = useAdminUrlState([
    'status',
    'search',
    'priceReview',
    'attention',
  ]);
  const page = parseInt(values.page || '1', 10);
  const attention = parseAttention(values.attention);

  const filters: Filters = useMemo(
    () => ({
      page,
      status: attention ? undefined : (values.status as OrderStatus) || undefined,
      search: attention ? undefined : values.search || undefined,
      priceReview:
        !attention && values.priceReview === 'pending' ? 'pending' : undefined,
      attention,
    }),
    [page, values.status, values.search, values.priceReview, attention]
  );

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setFilters = useCallback(
    (value: Filters | ((prev: Filters) => Filters)) => {
      setIsLoading(true);
      const next = typeof value === 'function' ? value(filters) : value;
      setUrlState({
        page: next.page,
        attention: next.attention || undefined,
        status: next.attention ? undefined : next.status || undefined,
        search: next.attention ? undefined : next.search || undefined,
        priceReview:
          !next.attention && next.priceReview === 'pending' ? 'pending' : undefined,
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

    const scheduleReload = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void (async () => {
          const res = await fetch(`/api/admin/orders?${buildAdminOrdersParams(filters)}`);
          if (res.ok) {
            const data = await res.json();
            setOrders(data.orders);
            setPagination(data.pagination);
          }
        })();
      }, REALTIME_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel('admin-orders-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        scheduleReload
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters]);

  const attentionLabel = filters.attention
    ? ATTENTION_LABELS[filters.attention]
    : null;

  return {
    orders,
    pagination,
    isLoading,
    filters,
    setFilters,
    attentionLabel,
  };
}
