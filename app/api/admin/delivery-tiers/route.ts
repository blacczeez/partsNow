import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getSystemConfig, updateSystemConfig } from '@/lib/services/admin';
import { deliveryTiersConfigSchema } from '@/lib/validators/admin';
import { validateDeliveryTiers } from '@/lib/utils/delivery-pricing';

export async function GET() {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const rows = await getSystemConfig();
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row.value]));

    return NextResponse.json({
      tiers: byKey.delivery_weight_tiers ?? [],
      freeDeliveryEligibleTiers: byKey.free_delivery_eligible_tiers ?? [],
      freeDeliveryThreshold: byKey.free_delivery_threshold ?? null,
    });
  } catch (error) {
    console.error('Delivery tiers fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery tiers' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = deliveryTiersConfigSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const tierError = validateDeliveryTiers(result.data.tiers);
    if (tierError) {
      return NextResponse.json({ error: tierError }, { status: 400 });
    }

    await updateSystemConfig(
      'delivery_weight_tiers',
      result.data.tiers,
      auth.user.id
    );

    if (result.data.freeDeliveryEligibleTiers) {
      await updateSystemConfig(
        'free_delivery_eligible_tiers',
        result.data.freeDeliveryEligibleTiers,
        auth.user.id
      );
    }

    if (result.data.freeDeliveryThreshold !== undefined) {
      await updateSystemConfig(
        'free_delivery_threshold',
        result.data.freeDeliveryThreshold,
        auth.user.id
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delivery tiers update error:', error);
    return NextResponse.json(
      { error: 'Failed to update delivery tiers' },
      { status: 500 }
    );
  }
}
