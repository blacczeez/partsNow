import type {
  DeliveryFeeBreakdown,
  DeliveryFeeResult,
  DeliveryPricingConfig,
  DeliveryWeightTier,
} from '@/lib/types/delivery';

export function computeTotalWeightKg(
  items: Array<{ weight_kg: number; quantity: number }>
): number {
  const total = items.reduce(
    (sum, item) => sum + item.weight_kg * item.quantity,
    0
  );
  return Math.round(total * 100) / 100;
}

export function resolveDeliveryTier(
  totalWeightKg: number,
  tiers: DeliveryWeightTier[]
): DeliveryWeightTier {
  const active = tiers
    .filter((tier) => tier.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const tier of active) {
    if (totalWeightKg < tier.min_kg) continue;
    if (tier.max_kg !== null && totalWeightKg > tier.max_kg) continue;
    return tier;
  }

  const fallback = active[active.length - 1];
  if (!fallback) {
    throw new Error('No active delivery tiers configured');
  }
  return fallback;
}

export function calculateDeliveryFee(
  subtotal: number,
  totalWeightKg: number,
  deliveryConfig: DeliveryPricingConfig
): DeliveryFeeResult {
  const tier = resolveDeliveryTier(totalWeightKg, deliveryConfig.tiers);
  const baseFee = tier.delivery_fee;
  const freeDeliveryApplied =
    subtotal >= deliveryConfig.freeDeliveryThreshold &&
    deliveryConfig.freeDeliveryEligibleTiers.includes(tier.id);
  const deliveryFee = freeDeliveryApplied ? 0 : baseFee;
  const deliveryType = tier.express_allowed ? 'express' : 'standard';

  return {
    tier,
    totalWeightKg,
    tierId: tier.id,
    tierLabel: tier.label,
    baseFee,
    deliveryFee,
    freeDeliveryApplied,
    vehicleType: tier.vehicle_type,
    deliveryType,
    promisedMinutes: tier.promise_minutes,
  };
}

export function toDeliveryFeeBreakdown(result: DeliveryFeeResult): DeliveryFeeBreakdown {
  const { tier: _tier, ...breakdown } = result;
  return breakdown;
}

export function validateDeliveryTiers(tiers: DeliveryWeightTier[]): string | null {
  if (tiers.length === 0) return 'At least one delivery tier is required';

  const active = tiers.filter((tier) => tier.is_active);
  if (active.length === 0) return 'At least one active delivery tier is required';

  const ids = new Set<string>();
  for (const tier of tiers) {
    if (!tier.id.trim()) return 'Each tier needs an id';
    if (ids.has(tier.id)) return `Duplicate tier id: ${tier.id}`;
    ids.add(tier.id);
    if (!tier.label.trim()) return `Tier ${tier.id} needs a label`;
    if (tier.min_kg < 0) return `Tier ${tier.id} min_kg cannot be negative`;
    if (tier.max_kg !== null && tier.max_kg < tier.min_kg) {
      return `Tier ${tier.id} max_kg must be >= min_kg`;
    }
    if (tier.delivery_fee < 0) return `Tier ${tier.id} delivery_fee cannot be negative`;
    if (tier.promise_minutes <= 0) return `Tier ${tier.id} promise_minutes must be positive`;
  }

  const sorted = [...active].sort((a, b) => a.sort_order - b.sort_order);
  if (sorted[0]?.min_kg !== 0) {
    return 'Lowest tier must start at 0 kg';
  }

  return null;
}

/** Riders with these profile vehicle types can fulfill the order vehicle need. */
export function riderVehicleTypesForOrder(
  vehicleType: DeliveryFeeResult['vehicleType']
): string[] {
  switch (vehicleType) {
    case 'bike':
      return ['bike', 'bicycle', 'motorcycle'];
    case 'car':
      return ['car', 'keke', 'van', 'bike', 'bicycle', 'motorcycle'];
    case 'van':
      return ['van', 'car', 'keke'];
    case 'partner':
      return ['van', 'car'];
    default:
      return ['bike', 'car', 'van'];
  }
}
