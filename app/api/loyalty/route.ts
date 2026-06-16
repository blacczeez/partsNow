import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLoyaltyThresholds } from '@/lib/services/loyalty-config';
import { getRuntimeConfig } from '@/lib/services/runtime-config';
import {
  buildLoyaltyTierDefinitions,
  getLoyaltyProgress,
} from '@/lib/utils/loyalty';
import type { LoyaltyTier } from '@/lib/types/database';

export async function GET() {
  const [thresholds, runtime] = await Promise.all([
    getLoyaltyThresholds(),
    getRuntimeConfig(),
  ]);
  const tiers = buildLoyaltyTierDefinitions(thresholds);

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let progress = null;
  if (authUser) {
    const { data: profile } = await supabase
      .from('users')
      .select('loyalty_tier, total_orders, lifetime_spend')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profile) {
      progress = getLoyaltyProgress(
        profile.loyalty_tier as LoyaltyTier,
        profile.total_orders,
        Number(profile.lifetime_spend),
        thresholds
      );
    }
  }

  return NextResponse.json({
    enabled: runtime.features.loyaltyDiscounts,
    baseMarkupPercentage: runtime.business.defaultMarkupPercentage,
    thresholds,
    tiers,
    progress,
  });
}
