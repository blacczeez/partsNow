import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTextMessage } from '@/lib/integrations/wati';
import type { LoyaltyTier, User } from '@/lib/types/database';
import { getRuntimeConfig } from '@/lib/services/runtime-config';
import {
  getDefaultLoyaltyThresholds,
  getLoyaltyThresholds,
} from '@/lib/services/loyalty-config';
import type { LoyaltyThresholds } from '@/lib/types/loyalty-thresholds';
import {
  formatLoyaltyTier,
  isLoyaltyUpgrade,
} from '@/lib/utils/loyalty';
import {
  getMarkupPercentage,
  type PricingRuntimeOptions,
} from '@/lib/utils/pricing';
import { config } from '@/lib/config';

export async function getCustomerLoyaltyTier(
  customerId: string
): Promise<LoyaltyTier> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('loyalty_tier')
    .eq('id', customerId)
    .maybeSingle();

  return (data?.loyalty_tier as LoyaltyTier) ?? 'new';
}

export async function notifyLoyaltyTierUpgradeIfNeeded(
  customerId: string,
  previousTier: LoyaltyTier
): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { data: customer } = await supabase
      .from('users')
      .select('phone, full_name, loyalty_tier, user_type')
      .eq('id', customerId)
      .single();

    if (!customer?.phone) return;

    const newTier = customer.loyalty_tier as LoyaltyTier;
    if (!isLoyaltyUpgrade(previousTier, newTier)) return;

    const thresholds = await getLoyaltyThresholds();
    const runtime = await getRuntimeConfig();
    const markup = getMarkupPercentage(newTier, thresholds, {
      defaultMarkupPercentage: runtime.business.defaultMarkupPercentage,
      loyaltyDiscountsEnabled: runtime.features.loyaltyDiscounts,
    });
    const message =
      `Congratulations ${customer.full_name.split(' ')[0]}! ` +
      `You've reached ${formatLoyaltyTier(newTier)} tier on PartsNow. ` +
      (runtime.features.loyaltyDiscounts &&
      markup < runtime.business.defaultMarkupPercentage
        ? `Your service fee is now ${markup}% on parts orders. `
        : '') +
      `Thank you for ordering with us.`;

    await sendTextMessage(customer.phone, message);
  } catch (err) {
    console.error('Loyalty tier notification failed:', err);
  }
}

export function formatWhatsAppLoyaltyLine(
  user: Pick<User, 'loyalty_tier'>,
  thresholds: LoyaltyThresholds = getDefaultLoyaltyThresholds(),
  runtime?: PricingRuntimeOptions
): string {
  const loyaltyOn =
    runtime?.loyaltyDiscountsEnabled ?? config.features.loyaltyDiscounts;
  if (!loyaltyOn) return '';

  const tier = user.loyalty_tier as LoyaltyTier;
  const markup = getMarkupPercentage(tier, thresholds, runtime);
  const base =
    runtime?.defaultMarkupPercentage ?? config.business.defaultMarkupPercentage;

  if (markup >= base) {
    if (tier === 'verified') {
      return `\nLoyalty: ${formatLoyaltyTier(tier)} — thanks for being a regular customer.`;
    }
    return '';
  }

  return `\nLoyalty: ${formatLoyaltyTier(tier)} — ${markup}% service fee (${base - markup} pts off).`;
}
