import { createServiceClient } from '@/lib/supabase/service';
import {
  DEFAULT_DELIVERY_WEIGHT_TIERS,
  DEFAULT_FREE_DELIVERY_ELIGIBLE_TIERS,
  getDefaultDeliveryPricingConfig,
} from '@/lib/constants/delivery-tiers';
import type { DeliveryPricingConfig, DeliveryWeightTier } from '@/lib/types/delivery';
import { config } from '@/lib/config';

function parseTiers(value: unknown): DeliveryWeightTier[] {
  if (!Array.isArray(value)) return DEFAULT_DELIVERY_WEIGHT_TIERS;
  return value as DeliveryWeightTier[];
}

function parseEligibleTiers(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_FREE_DELIVERY_ELIGIBLE_TIERS;
  return value.filter((item): item is string => typeof item === 'string');
}

export async function getDeliveryPricingConfig(): Promise<DeliveryPricingConfig> {
  const defaults = getDefaultDeliveryPricingConfig();

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', ['delivery_weight_tiers', 'free_delivery_eligible_tiers', 'free_delivery_threshold']);

    if (error || !data?.length) return defaults;

    const byKey = Object.fromEntries(
      (data as Array<{ key: string; value: unknown }>).map((row) => [row.key, row.value])
    );

    const thresholdRaw = byKey.free_delivery_threshold;
    const freeDeliveryThreshold =
      typeof thresholdRaw === 'number'
        ? thresholdRaw
        : config.business.freeDeliveryThreshold;

    return {
      tiers: parseTiers(byKey.delivery_weight_tiers),
      freeDeliveryThreshold,
      freeDeliveryEligibleTiers: parseEligibleTiers(byKey.free_delivery_eligible_tiers),
    };
  } catch {
    return defaults;
  }
}
