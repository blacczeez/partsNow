'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RiderDeliverySummary } from '@/lib/services/rider';

export function useRiderOrders() {
  const [orders, setOrders] = useState<RiderDeliverySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/rider/orders');
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch deliveries');

      setOrders(data.orders || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deliveries');
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
      .channel('rider-assignments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_assignments',
        },
        () => {
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
