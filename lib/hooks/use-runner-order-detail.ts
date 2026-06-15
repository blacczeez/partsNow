'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RunnerOrderDetail } from '@/lib/services/runner';
import { orderNeedsRunnerPriceReviewPolling } from '@/lib/utils/runner-price-review';

export function useRunnerOrderDetail(orderId: string) {
  const [order, setOrder] = useState<RunnerOrderDetail | null>(null);
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

    async function loadOrder() {
      try {
        const res = await fetch(`/api/runner/orders/${orderId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to fetch order');

        if (!cancelled) {
          setOrder(data.order);
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

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/runner/orders/${orderId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch order');

      setOrder(data.order);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch order');
    }
  }, [orderId]);

  // Live updates when admin or customer resolves price review
  useEffect(() => {
    if (!orderId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`runner-order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId, refresh]);

  // Poll while waiting on admin/customer during price review
  useEffect(() => {
    if (!order || !orderNeedsRunnerPriceReviewPolling(order)) return;

    const interval = setInterval(() => {
      void refresh();
    }, 15000);

    return () => clearInterval(interval);
  }, [order, refresh]);

  const acceptOrder = useCallback(async () => {
    const res = await fetch(`/api/runner/orders/${orderId}/accept`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to accept order');
    await refresh();
  }, [orderId, refresh]);

  const rejectOrder = useCallback(
    async (reason: string) => {
      const res = await fetch(`/api/runner/orders/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject order');
      await refresh();
    },
    [orderId, refresh]
  );

  const releaseOrder = useCallback(
    async (reason?: string) => {
      const res = await fetch(`/api/runner/orders/${orderId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reason ? { reason } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to release order');
      await refresh();
    },
    [orderId, refresh]
  );

  const markItemFound = useCallback(
    async (
      itemId: string,
      input: { vendorId?: string; vendorPrice: number; qcImageUrl: string }
    ) => {
      const res = await fetch(
        `/api/runner/orders/${orderId}/items/${itemId}/found`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark item as found');
      await refresh();
      return data as {
        priceReviewPending?: boolean;
        targetVendorPrice?: number;
        expectedVendorPrice?: number;
      };
    },
    [orderId, refresh]
  );

  const markItemUnavailable = useCallback(
    async (itemId: string, reason: string) => {
      const res = await fetch(
        `/api/runner/orders/${orderId}/items/${itemId}/unavailable`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark item as unavailable');
      await refresh();
    },
    [orderId, refresh]
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
      await refresh();
    },
    [orderId, refresh]
  );

  const completeOrder = useCallback(async () => {
    const res = await fetch(`/api/runner/orders/${orderId}/complete`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to complete order');
    await refresh();
  }, [orderId, refresh]);

  return {
    order,
    isLoading,
    error,
    refresh,
    acceptOrder,
    rejectOrder,
    releaseOrder,
    markItemFound,
    markItemUnavailable,
    requestClarification,
    completeOrder,
  };
}
