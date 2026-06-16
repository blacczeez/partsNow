import { getRuntimeConfig } from '@/lib/services/runtime-config';
import type { DeliveryPricingConfig } from '@/lib/types/delivery';
import { getDefaultDeliveryPricingConfig } from '@/lib/constants/delivery-tiers';

export async function getDeliveryPricingConfig(): Promise<DeliveryPricingConfig> {
  const runtime = await getRuntimeConfig();
  return runtime.deliveryPricing;
}

export { getDefaultDeliveryPricingConfig };
