'use client';

import { useState, useEffect, useCallback } from 'react';
import type { OrderWithItems } from '@/lib/types/database';
import type { OrderVehicleSummary } from '@/lib/services/order-vehicle';

interface OrderDetail extends OrderWithItems {
  order_assignments: unknown[];
  delivery_tracking: unknown[];
  vehicle?: OrderVehicleSummary | null;
}

async function fetchOrderDetail(orderId: string): Promise<OrderDetail> {
  const res = await fetch(`/api/orders/${orderId}`);
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to fetch order');
  }
  const data = await res.json();
  return data.order;
}

export function useOrder(orderId: string) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prevOrderId, setPrevOrderId] = useState(orderId);

  if (orderId !== prevOrderId) {
    setPrevOrderId(orderId);
    setIsLoading(true);
    setOrder(null);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const detail = await fetchOrderDetail(orderId);
        if (!cancelled) {
          setOrder(detail);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch order');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const detail = await fetchOrderDetail(orderId);
      setOrder(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch order');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  return { order, isLoading, error, refresh };
}
