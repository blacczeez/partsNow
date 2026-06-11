'use client';

import { useEffect, useState } from 'react';
import { getDefaultDeliveryPricingConfig } from '@/lib/constants/delivery-tiers';
import type { DeliveryPricingConfig } from '@/lib/types/delivery';

export function useDeliveryConfig() {
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryPricingConfig>(
    getDefaultDeliveryPricingConfig()
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/delivery/config')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load delivery config');
        if (!cancelled) {
          setDeliveryConfig({
            tiers: data.tiers ?? getDefaultDeliveryPricingConfig().tiers,
            freeDeliveryThreshold:
              data.freeDeliveryThreshold ??
              getDefaultDeliveryPricingConfig().freeDeliveryThreshold,
            freeDeliveryEligibleTiers:
              data.freeDeliveryEligibleTiers ??
              getDefaultDeliveryPricingConfig().freeDeliveryEligibleTiers,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDeliveryConfig(getDefaultDeliveryPricingConfig());
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { deliveryConfig, isLoading };
}
