import type { LoyaltyTier } from '@/lib/types/database';

export const LOYALTY_TIER_ORDER: LoyaltyTier[] = [
  'new',
  'verified',
  'trusted',
  'partner',
];

export const LOYALTY_TIER_LABELS: Record<LoyaltyTier, string> = {
  new: 'New',
  verified: 'Verified',
  trusted: 'Trusted',
  partner: 'Partner',
};

export interface LoyaltyTierDefinition {
  tier: LoyaltyTier;
  label: string;
  minOrders: number;
  minLifetimeSpend: number;
  markupDiscountPoints: number;
  benefits: string[];
}

export const DEFAULT_LOYALTY_THRESHOLDS = {
  verifiedMinOrders: 5,
  trustedMinOrders: 20,
  partnerMinOrders: 50,
  partnerMinLifetimeSpend: 500_000,
  trustedDiscountPercentage: 5,
  partnerDiscountPercentage: 8,
} as const;
