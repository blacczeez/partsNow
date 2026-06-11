import type { DeliveryPricingConfig, DeliveryWeightTier } from '@/lib/types/delivery';
import { config } from '@/lib/config';

export const DEFAULT_DELIVERY_WEIGHT_TIERS: DeliveryWeightTier[] = [
  {
    id: 'light',
    label: 'Light',
    min_kg: 0,
    max_kg: 5,
    delivery_fee: 1500,
    vehicle_type: 'bike',
    express_allowed: true,
    promise_minutes: 45,
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'medium',
    label: 'Medium',
    min_kg: 5,
    max_kg: 15,
    delivery_fee: 2500,
    vehicle_type: 'car',
    express_allowed: true,
    promise_minutes: 45,
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'heavy',
    label: 'Heavy',
    min_kg: 15,
    max_kg: 40,
    delivery_fee: 4000,
    vehicle_type: 'car',
    express_allowed: false,
    promise_minutes: 120,
    sort_order: 3,
    is_active: true,
  },
  {
    id: 'oversized',
    label: 'Oversized',
    min_kg: 40,
    max_kg: null,
    delivery_fee: 6000,
    vehicle_type: 'van',
    express_allowed: false,
    promise_minutes: 120,
    sort_order: 4,
    is_active: true,
  },
];

export const DEFAULT_FREE_DELIVERY_ELIGIBLE_TIERS = ['light', 'medium'];

export function getDefaultDeliveryPricingConfig(): DeliveryPricingConfig {
  return {
    tiers: DEFAULT_DELIVERY_WEIGHT_TIERS,
    freeDeliveryThreshold: config.business.freeDeliveryThreshold,
    freeDeliveryEligibleTiers: DEFAULT_FREE_DELIVERY_ELIGIBLE_TIERS,
  };
}
