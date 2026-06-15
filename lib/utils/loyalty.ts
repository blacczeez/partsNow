import type { LoyaltyTier } from '@/lib/types/database';
import {
  getDefaultLoyaltyThresholds,
  type LoyaltyThresholds,
} from '@/lib/services/loyalty-config';
import {
  LOYALTY_TIER_LABELS,
  LOYALTY_TIER_ORDER,
  type LoyaltyTierDefinition,
} from '@/lib/constants/loyalty';
import { config } from '@/lib/config';
import { getMarkupPercentage } from '@/lib/utils/pricing';

const TIER_RANK: Record<LoyaltyTier, number> = {
  new: 0,
  verified: 1,
  trusted: 2,
  partner: 3,
};

export function formatLoyaltyTier(tier: LoyaltyTier): string {
  return LOYALTY_TIER_LABELS[tier];
}

export function compareLoyaltyTiers(a: LoyaltyTier, b: LoyaltyTier): number {
  return TIER_RANK[a] - TIER_RANK[b];
}

export function isLoyaltyUpgrade(previous: LoyaltyTier, next: LoyaltyTier): boolean {
  return compareLoyaltyTiers(next, previous) > 0;
}

export function calculateLoyaltyTierFromStats(
  totalOrders: number,
  lifetimeSpend: number,
  thresholds: LoyaltyThresholds
): LoyaltyTier {
  if (
    totalOrders >= thresholds.partnerMinOrders &&
    lifetimeSpend >= thresholds.partnerMinLifetimeSpend
  ) {
    return 'partner';
  }
  if (totalOrders >= thresholds.trustedMinOrders) return 'trusted';
  if (totalOrders >= thresholds.verifiedMinOrders) return 'verified';
  return 'new';
}

export function buildLoyaltyTierDefinitions(
  thresholds: LoyaltyThresholds
): LoyaltyTierDefinition[] {
  const baseMarkup = config.business.defaultMarkupPercentage;

  return [
    {
      tier: 'new',
      label: LOYALTY_TIER_LABELS.new,
      minOrders: 0,
      minLifetimeSpend: 0,
      markupDiscountPoints: 0,
      benefits: [`${baseMarkup}% service fee on parts`],
    },
    {
      tier: 'verified',
      label: LOYALTY_TIER_LABELS.verified,
      minOrders: thresholds.verifiedMinOrders,
      minLifetimeSpend: 0,
      markupDiscountPoints: 0,
      benefits: [
        'Trusted workshop badge',
        `${baseMarkup}% service fee (status milestone)`,
      ],
    },
    {
      tier: 'trusted',
      label: LOYALTY_TIER_LABELS.trusted,
      minOrders: thresholds.trustedMinOrders,
      minLifetimeSpend: 0,
      markupDiscountPoints: thresholds.trustedDiscountPercentage,
      benefits: [
        `${baseMarkup - thresholds.trustedDiscountPercentage}% service fee (${thresholds.trustedDiscountPercentage} pts off)`,
        'Lower platform markup on every order',
      ],
    },
    {
      tier: 'partner',
      label: LOYALTY_TIER_LABELS.partner,
      minOrders: thresholds.partnerMinOrders,
      minLifetimeSpend: thresholds.partnerMinLifetimeSpend,
      markupDiscountPoints: thresholds.partnerDiscountPercentage,
      benefits: [
        `${baseMarkup - thresholds.partnerDiscountPercentage}% service fee (${thresholds.partnerDiscountPercentage} pts off)`,
        'Waived return handling fee on delivery disputes',
        'Priority partner status',
      ],
    },
  ];
}

export interface LoyaltyProgress {
  currentTier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  ordersProgress: number;
  ordersTarget: number | null;
  spendProgress: number;
  spendTarget: number | null;
  ordersRemaining: number | null;
  spendRemaining: number | null;
}

export function getLoyaltyProgress(
  tier: LoyaltyTier,
  totalOrders: number,
  lifetimeSpend: number,
  thresholds: LoyaltyThresholds
): LoyaltyProgress {
  const nextTier: LoyaltyTier | null =
    tier === 'partner'
      ? null
      : LOYALTY_TIER_ORDER[LOYALTY_TIER_ORDER.indexOf(tier) + 1] ?? null;

  if (!nextTier) {
    return {
      currentTier: tier,
      nextTier: null,
      ordersProgress: 1,
      ordersTarget: null,
      spendProgress: 1,
      spendTarget: null,
      ordersRemaining: null,
      spendRemaining: null,
    };
  }

  let ordersTarget: number;
  let spendTarget = 0;

  switch (nextTier) {
    case 'verified':
      ordersTarget = thresholds.verifiedMinOrders;
      break;
    case 'trusted':
      ordersTarget = thresholds.trustedMinOrders;
      break;
    case 'partner':
      ordersTarget = thresholds.partnerMinOrders;
      spendTarget = thresholds.partnerMinLifetimeSpend;
      break;
    default:
      ordersTarget = thresholds.verifiedMinOrders;
  }

  const ordersRemaining = Math.max(0, ordersTarget - totalOrders);
  const spendRemaining =
    spendTarget > 0 ? Math.max(0, spendTarget - lifetimeSpend) : null;

  return {
    currentTier: tier,
    nextTier,
    ordersProgress: Math.min(1, totalOrders / ordersTarget),
    ordersTarget,
    spendProgress: spendTarget > 0 ? Math.min(1, lifetimeSpend / spendTarget) : 1,
    spendTarget: spendTarget > 0 ? spendTarget : null,
    ordersRemaining,
    spendRemaining,
  };
}

export type LoyaltyPricingThresholds = Pick<
  LoyaltyThresholds,
  'trustedDiscountPercentage' | 'partnerDiscountPercentage'
>;

export function calculateLoyaltySavings(
  subtotal: number,
  tier: LoyaltyTier,
  thresholds: LoyaltyPricingThresholds = getDefaultLoyaltyThresholds()
): number {
  if (!config.features.loyaltyDiscounts || subtotal <= 0) return 0;

  const baseMarkup = config.business.defaultMarkupPercentage;
  const actualMarkup = getMarkupPercentage(tier, thresholds);
  if (actualMarkup >= baseMarkup) return 0;

  return Math.round(subtotal * ((baseMarkup - actualMarkup) / 100));
}

export function getLoyaltyServiceFeeLabel(
  tier: LoyaltyTier,
  thresholds: LoyaltyPricingThresholds = getDefaultLoyaltyThresholds(),
  markupPercentage?: number
): string {
  const markup = markupPercentage ?? getMarkupPercentage(tier, thresholds);
  const base = config.business.defaultMarkupPercentage;

  if (!config.features.loyaltyDiscounts || markup >= base) {
    return `Service fee (${markup}%)`;
  }

  return `Service fee (${markup}% — ${formatLoyaltyTier(tier)} benefit)`;
}
