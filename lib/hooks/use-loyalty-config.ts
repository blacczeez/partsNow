'use client';

import { useEffect, useState } from 'react';
import { getDefaultLoyaltyThresholds } from '@/lib/services/loyalty-config';
import type { LoyaltyThresholds } from '@/lib/services/loyalty-config';
import type { LoyaltyTierDefinition } from '@/lib/constants/loyalty';
import type { LoyaltyProgress } from '@/lib/utils/loyalty';

interface LoyaltyConfigState {
  enabled: boolean;
  thresholds: LoyaltyThresholds;
  tiers: LoyaltyTierDefinition[];
  progress: LoyaltyProgress | null;
  isLoading: boolean;
}

const defaults = getDefaultLoyaltyThresholds();

export function useLoyaltyConfig(): LoyaltyConfigState {
  const [state, setState] = useState<LoyaltyConfigState>({
    enabled: true,
    thresholds: defaults,
    tiers: [],
    progress: null,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/loyalty');
        const data = await res.json();
        if (!res.ok || cancelled) return;

        setState({
          enabled: data.enabled ?? true,
          thresholds: data.thresholds ?? defaults,
          tiers: data.tiers ?? [],
          progress: data.progress ?? null,
          isLoading: false,
        });
      } catch {
        if (!cancelled) {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
