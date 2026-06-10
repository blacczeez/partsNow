import type { LoyaltyTier } from '@/lib/types/database';
import type { PricingBreakdown } from '@/lib/types/orders';
import { config } from '@/lib/config';

export function getMarkupPercentage(loyaltyTier: LoyaltyTier): number {
  const base = config.business.defaultMarkupPercentage;

  if (!config.features.loyaltyDiscounts) {
    return base;
  }

  switch (loyaltyTier) {
    case 'partner':
      return base - config.loyalty.partnerDiscountPercentage;
    case 'trusted':
      return base - config.loyalty.trustedDiscountPercentage;
    default:
      return base;
  }
}

export function calculatePricing(
  items: Array<{ price: number; quantity: number }>,
  loyaltyTier: LoyaltyTier = 'new'
): PricingBreakdown {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const markupPercentage = getMarkupPercentage(loyaltyTier);
  const markupAmount = Math.round(subtotal * (markupPercentage / 100));

  const deliveryFee =
    subtotal >= config.business.freeDeliveryThreshold
      ? 0
      : config.business.standardDeliveryFee;

  const discountAmount = 0; // Loyalty discount handled via markup reduction

  const total = subtotal + markupAmount + deliveryFee - discountAmount;

  return {
    subtotal,
    markupAmount,
    deliveryFee,
    discountAmount,
    total,
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
