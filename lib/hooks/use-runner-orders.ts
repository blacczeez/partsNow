'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RunnerOrderSummary } from '@/lib/services/runner';

export function useRunnerOrders() {
  const [orders, setOrders] = useState<RunnerOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/runner/orders');
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch orders');

      setOrders(data.orders || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Subscribe to realtime changes on order_assignments
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('runner-assignments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_assignments',
        },
        () => {
          // Refetch orders when assignments change
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  return { orders, isLoading, error, refresh: fetchOrders };
}
