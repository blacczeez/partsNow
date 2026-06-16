import { config } from '@/lib/config';
import { getRuntimeConfig } from '@/lib/services/runtime-config';
import type { LoyaltyThresholds } from '@/lib/types/loyalty-thresholds';

export type { LoyaltyThresholds };

export function getDefaultLoyaltyThresholds(): LoyaltyThresholds {
  return {
    verifiedMinOrders: config.loyalty.verifiedMinOrders,
    trustedMinOrders: config.loyalty.trustedMinOrders,
    partnerMinOrders: config.loyalty.partnerMinOrders,
    partnerMinLifetimeSpend: config.loyalty.partnerMinLifetimeSpend,
    trustedDiscountPercentage: config.loyalty.trustedDiscountPercentage,
    partnerDiscountPercentage: config.loyalty.partnerDiscountPercentage,
  };
}

export async function getLoyaltyThresholds(): Promise<LoyaltyThresholds> {
  const runtime = await getRuntimeConfig();
  return runtime.loyalty;
}
