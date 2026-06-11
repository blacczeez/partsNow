import { NextResponse } from 'next/server';
import { getDeliveryPricingConfig } from '@/lib/services/delivery-config';

export async function GET() {
  try {
    const deliveryConfig = await getDeliveryPricingConfig();
    return NextResponse.json({
      tiers: deliveryConfig.tiers.filter((tier) => tier.is_active),
      freeDeliveryThreshold: deliveryConfig.freeDeliveryThreshold,
      freeDeliveryEligibleTiers: deliveryConfig.freeDeliveryEligibleTiers,
    });
  } catch (error) {
    console.error('Delivery config error:', error);
    return NextResponse.json(
      { error: 'Failed to load delivery configuration' },
      { status: 500 }
    );
  }
}
