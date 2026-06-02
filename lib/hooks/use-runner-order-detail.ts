'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RunnerOrderDetail } from '@/lib/services/runner';

export function useRunnerOrderDetail(orderId: string) {
  const [order, setOrder] = useState<RunnerOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/runner/orders/${orderId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch order');

      setOrder(data.order);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch order');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const acceptOrder = useCallback(async () => {
    const res = await fetch(`/api/runner/orders/${orderId}/accept`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to accept order');
    await fetchOrder();
  }, [orderId, fetchOrder]);

  const rejectOrder = useCallback(
    async (reason: string) => {
      const res = await fetch(`/api/runner/orders/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject order');
      await fetchOrder();
    },
    [orderId, fetchOrder]
  );

  const markItemFound = useCallback(
    async (
      itemId: string,
      input: { vendorId?: string; vendorPrice: number; qcImageUrl: string }
    ) => {
      const res = await fetch(
        `/api/runner/orders/${orderId}/item/${itemId}/found`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark item as found');
      await fetchOrder();
    },
    [orderId, fetchOrder]
  );

  const markItemUnavailable = useCallback(
    async (itemId: string, reason: string) => {
      const res = await fetch(
        `/api/runner/orders/${orderId}/item/${itemId}/unavailable`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark item as unavailable');
      await fetchOrder();
    },
    [orderId, fetchOrder]
  );

  const requestClarification = useCallback(
    async (message: string) => {
      const res = await fetch(`/api/runner/orders/${orderId}/clarify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request clarification');
      await fetchOrder();
    },
    [orderId, fetchOrder]
  );

  const completeOrder = useCallback(async () => {
    const res = await fetch(`/api/runner/orders/${orderId}/complete`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to complete order');
    await fetchOrder();
  }, [orderId, fetchOrder]);

  return {
    order,
    isLoading,
    error,
    refresh: fetchOrder,
    acceptOrder,
    rejectOrder,
    markItemFound,
    markItemUnavailable,
    requestClarification,
    completeOrder,
  };
}
