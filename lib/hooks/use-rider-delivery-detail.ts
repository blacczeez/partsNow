'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RiderDeliveryDetail } from '@/lib/services/rider';
import { orderNeedsRunnerPriceReviewPolling } from '@/lib/utils/runner-price-review';

export function useRiderDeliveryDetail(orderId: string) {
  const [delivery, setDelivery] = useState<RiderDeliveryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prevOrderId, setPrevOrderId] = useState(orderId);

  if (orderId !== prevOrderId) {
    setPrevOrderId(orderId);
    setIsLoading(true);
    setDelivery(null);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadDelivery() {
      try {
        const res = await fetch(`/api/rider/orders/${orderId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to fetch delivery');

        if (!cancelled) {
          setDelivery(data.delivery);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to fetch delivery'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDelivery();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/rider/orders/${orderId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch delivery');

      setDelivery(data.delivery);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch delivery');
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`rider-delivery-${orderId}`)
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

  useEffect(() => {
    if (!delivery || !orderNeedsRunnerPriceReviewPolling(delivery)) return;

    const interval = setInterval(() => {
      void refresh();
    }, 15000);

    return () => clearInterval(interval);
  }, [delivery, refresh]);

  const confirmPickup = useCallback(
    async (pickupPhotoUrl?: string) => {
      const res = await fetch(`/api/rider/orders/${orderId}/pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickupPhotoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm pickup');
      await refresh();
    },
    [orderId, refresh]
  );

  const confirmDelivery = useCallback(
    async (input: { photoUrl?: string; codAmountCollected?: number }) => {
      const res = await fetch(`/api/rider/orders/${orderId}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm delivery');
      await refresh();
    },
    [orderId, refresh]
  );

  const rejectDelivery = useCallback(
    async (reason: string) => {
      const res = await fetch(`/api/rider/orders/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to decline delivery');
      await refresh();
    },
    [orderId, refresh]
  );

  const releaseDelivery = useCallback(
    async (reason?: string) => {
      const res = await fetch(`/api/rider/orders/${orderId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reason ? { reason } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to release delivery');
      await refresh();
    },
    [orderId, refresh]
  );

  const reportFailure = useCallback(
    async (input: { reason: string; notes?: string; photoUrl?: string }) => {
      const res = await fetch(`/api/rider/orders/${orderId}/fail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to report failure');
      await refresh();
    },
    [orderId, refresh]
  );

  return {
    delivery,
    isLoading,
    error,
    refresh,
    confirmPickup,
    confirmDelivery,
    rejectDelivery,
    releaseDelivery,
    reportFailure,
  };
}
