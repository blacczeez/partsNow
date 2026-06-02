'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RiderDeliveryDetail } from '@/lib/services/rider';

export function useRiderDeliveryDetail(orderId: string) {
  const [delivery, setDelivery] = useState<RiderDeliveryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDelivery = useCallback(async () => {
    try {
      const res = await fetch(`/api/rider/orders/${orderId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch delivery');

      setDelivery(data.delivery);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch delivery');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchDelivery();
  }, [fetchDelivery]);

  const confirmPickup = useCallback(
    async (pickupPhotoUrl?: string) => {
      const res = await fetch(`/api/rider/orders/${orderId}/pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickupPhotoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm pickup');
      await fetchDelivery();
    },
    [orderId, fetchDelivery]
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
      await fetchDelivery();
    },
    [orderId, fetchDelivery]
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
      await fetchDelivery();
    },
    [orderId, fetchDelivery]
  );

  return {
    delivery,
    isLoading,
    error,
    refresh: fetchDelivery,
    confirmPickup,
    confirmDelivery,
    reportFailure,
  };
}
