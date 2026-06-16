'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RunnerOrderSummary } from '@/lib/services/runner';

async function fetchRunnerOrders(): Promise<{
  orders: RunnerOrderSummary[];
  error: string | null;
}> {
  const res = await fetch('/api/runner/orders');
  const data = await res.json();

  if (!res.ok) {
    return {
      orders: [],
      error: data.error || 'Failed to fetch orders',
    };
  }

  return {
    orders: data.orders || [],
    error: null,
  };
}

export function useRunnerOrders(shiftActive = true) {
  const [orders, setOrders] = useState<RunnerOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(shiftActive);
  const [error, setError] = useState<string | null>(null);
  const [prevShiftActive, setPrevShiftActive] = useState(shiftActive);

  if (shiftActive !== prevShiftActive) {
    setPrevShiftActive(shiftActive);
    if (!shiftActive) {
      setOrders([]);
      setIsLoading(false);
      setError(null);
    } else {
      setIsLoading(true);
    }
  }

  const refresh = useCallback(async () => {
    if (!shiftActive) return;
    const result = await fetchRunnerOrders();
    setOrders(result.orders);
    setError(result.error);
    setIsLoading(false);
  }, [shiftActive]);

  useEffect(() => {
    if (!shiftActive) return;

    let cancelled = false;

    async function loadOrders() {
      try {
        const result = await fetchRunnerOrders();
        if (!cancelled) {
          setOrders(result.orders);
          setError(result.error);
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
  }, [shiftActive]);

  useEffect(() => {
    if (!shiftActive) return;

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
          void refresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shiftActive, refresh]);

  return { orders, isLoading, error, refresh };
}
