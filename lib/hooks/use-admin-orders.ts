'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { OrderStatus } from '@/lib/types/database';

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
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Filters {
  page: number;
  status?: OrderStatus;
  search?: string;
}

export function useAdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<Filters>({ page: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async (f: Filters) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(f.page), limit: '20' });
      if (f.status) params.set('status', f.status);
      if (f.search) params.set('search', f.search);

      const res = await fetch(`/api/admin/orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        setPagination(data.pagination);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(filters);
  }, [filters, fetchOrders]);

  // Realtime refresh
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-orders-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders(filters);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters, fetchOrders]);

  return { orders, pagination, isLoading, filters, setFilters };
}
