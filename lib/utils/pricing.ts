import type { LoyaltyTier } from '@/lib/types/database';
import type { PricingBreakdown } from '@/lib/types/orders';
import type { DeliveryPricingConfig } from '@/lib/types/delivery';
import {
  calculateLoyaltySavings,
  type LoyaltyPricingThresholds,
} from '@/lib/utils/loyalty';
import { getDefaultLoyaltyThresholds } from '@/lib/services/loyalty-config';
import { config } from '@/lib/config';
import { getDefaultDeliveryPricingConfig } from '@/lib/constants/delivery-tiers';
import {
  calculateDeliveryFee,
  computeTotalWeightKg,
} from '@/lib/utils/delivery-pricing';

export interface PricingRuntimeOptions {
  defaultMarkupPercentage?: number;
  loyaltyDiscountsEnabled?: boolean;
  standardDeliveryFee?: number;
}

export function getMarkupPercentage(
  loyaltyTier: LoyaltyTier,
  thresholds: LoyaltyPricingThresholds = getDefaultLoyaltyThresholds(),
  runtime?: PricingRuntimeOptions
): number {
  const base = runtime?.defaultMarkupPercentage ?? config.business.defaultMarkupPercentage;
  const loyaltyOn = runtime?.loyaltyDiscountsEnabled ?? config.features.loyaltyDiscounts;

  if (!loyaltyOn) {
    return base;
  }

  switch (loyaltyTier) {
    case 'partner':
      return base - thresholds.partnerDiscountPercentage;
    case 'trusted':
      return base - thresholds.trustedDiscountPercentage;
    default:
      return base;
  }
}

export function calculatePricing(
  items: Array<{ price: number; quantity: number; weightKg?: number | null }>,
  loyaltyTier: LoyaltyTier = 'new',
  deliveryConfig: DeliveryPricingConfig = getDefaultDeliveryPricingConfig(),
  thresholds: LoyaltyPricingThresholds = getDefaultLoyaltyThresholds(),
  runtime?: PricingRuntimeOptions
): PricingBreakdown {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const markupPercentage = getMarkupPercentage(loyaltyTier, thresholds, runtime);
  const markupAmount = Math.round(subtotal * (markupPercentage / 100));

  const weightItems = items
    .filter((item) => item.weightKg != null && item.weightKg > 0)
    .map((item) => ({ weight_kg: item.weightKg as number, quantity: item.quantity }));

  let deliveryFee = runtime?.standardDeliveryFee ?? config.business.standardDeliveryFee;
  let totalWeightKg: number | undefined;
  let deliveryTierLabel: string | undefined;
  let deliveryTierId: string | undefined;
  let deliveryType: 'express' | 'standard' | undefined;
  let freeDeliveryApplied: boolean | undefined;
  let deliveryFeeLabel: string | undefined;

  if (weightItems.length > 0) {
    totalWeightKg = computeTotalWeightKg(weightItems);
    const delivery = calculateDeliveryFee(subtotal, totalWeightKg, deliveryConfig);
    deliveryFee = delivery.deliveryFee;
    deliveryTierLabel = delivery.tierLabel;
    deliveryTierId = delivery.tierId;
    deliveryType = delivery.deliveryType;
    freeDeliveryApplied = delivery.freeDeliveryApplied;
    deliveryFeeLabel = freeDeliveryApplied
      ? `Free delivery (${delivery.tierLabel})`
      : `${delivery.tierLabel} delivery · ${totalWeightKg} kg`;
  } else if (subtotal >= deliveryConfig.freeDeliveryThreshold) {
    deliveryFee = 0;
    freeDeliveryApplied = true;
    deliveryFeeLabel = 'Free delivery';
  }

  const discountAmount = 0;
  const loyaltySavings = calculateLoyaltySavings(subtotal, loyaltyTier, thresholds);
  const total = subtotal + markupAmount + deliveryFee - discountAmount;

  return {
    subtotal,
    markupAmount,
    deliveryFee,
    discountAmount,
    total,
    loyaltyTier,
    markupPercentage,
    loyaltySavings,
    totalWeightKg,
    deliveryTierLabel,
    deliveryTierId,
    deliveryType,
    freeDeliveryApplied,
    deliveryFeeLabel,
  };
}

export function isCodAllowed(total: number): boolean {
  return config.payments.codEnabled && total <= config.payments.codMaxOrderValue;
}

export function isCodAllowedForCustomer(
  total: number,
  profile?: Record<string, unknown> | null
): boolean {
  if (profile?.cod_disabled === true) return false;
  return isCodAllowed(total);
}
