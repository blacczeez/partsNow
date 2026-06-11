import type { DeliveryType } from '@/lib/types/database';

export type DeliveryVehicleType = 'bike' | 'car' | 'van' | 'partner';

export interface DeliveryWeightTier {
  id: string;
  label: string;
  min_kg: number;
  max_kg: number | null;
  delivery_fee: number;
  vehicle_type: DeliveryVehicleType;
  express_allowed: boolean;
  promise_minutes: number;
  sort_order: number;
  is_active: boolean;
}

export interface DeliveryPricingConfig {
  tiers: DeliveryWeightTier[];
  freeDeliveryThreshold: number;
  freeDeliveryEligibleTiers: string[];
}

export interface DeliveryFeeBreakdown {
  totalWeightKg: number;
  tierId: string;
  tierLabel: string;
  baseFee: number;
  deliveryFee: number;
  freeDeliveryApplied: boolean;
  vehicleType: DeliveryVehicleType;
  deliveryType: DeliveryType;
  promisedMinutes: number;
}

export interface DeliveryFeeResult extends DeliveryFeeBreakdown {
  tier: DeliveryWeightTier;
}
