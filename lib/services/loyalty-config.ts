import { createServiceClient } from '@/lib/supabase/service';
import { config } from '@/lib/config';
import { DEFAULT_LOYALTY_THRESHOLDS } from '@/lib/constants/loyalty';

export interface LoyaltyThresholds {
  verifiedMinOrders: number;
  trustedMinOrders: number;
  partnerMinOrders: number;
  partnerMinLifetimeSpend: number;
  trustedDiscountPercentage: number;
  partnerDiscountPercentage: number;
}

function parseConfigInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

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
  const defaults = getDefaultLoyaltyThresholds();

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', [
        'loyalty_verified_min_orders',
        'loyalty_trusted_min_orders',
        'loyalty_partner_min_orders',
        'loyalty_partner_min_lifetime_spend',
        'loyalty_trusted_discount_percentage',
        'loyalty_partner_discount_percentage',
      ]);

    if (error || !data?.length) return defaults;

    const byKey = Object.fromEntries(
      (data as Array<{ key: string; value: unknown }>).map((row) => [row.key, row.value])
    );

    return {
      verifiedMinOrders: parseConfigInt(
        byKey.loyalty_verified_min_orders,
        defaults.verifiedMinOrders
      ),
      trustedMinOrders: parseConfigInt(
        byKey.loyalty_trusted_min_orders,
        defaults.trustedMinOrders
      ),
      partnerMinOrders: parseConfigInt(
        byKey.loyalty_partner_min_orders,
        defaults.partnerMinOrders
      ),
      partnerMinLifetimeSpend: parseConfigInt(
        byKey.loyalty_partner_min_lifetime_spend,
        defaults.partnerMinLifetimeSpend
      ),
      trustedDiscountPercentage: parseConfigInt(
        byKey.loyalty_trusted_discount_percentage,
        defaults.trustedDiscountPercentage
      ),
      partnerDiscountPercentage: parseConfigInt(
        byKey.loyalty_partner_discount_percentage,
        defaults.partnerDiscountPercentage
      ),
    };
  } catch {
    return defaults;
  }
}
