import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTextMessage } from '@/lib/integrations/wati';
import type { LoyaltyTier, User } from '@/lib/types/database';
import { getLoyaltyThresholds } from '@/lib/services/loyalty-config';
import { formatLoyaltyTier, isLoyaltyUpgrade } from '@/lib/utils/loyalty';
import { getMarkupPercentage } from '@/lib/utils/pricing';
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
    const markup = getMarkupPercentage(newTier, thresholds);
    const message =
      `Congratulations ${customer.full_name.split(' ')[0]}! ` +
      `You've reached ${formatLoyaltyTier(newTier)} tier on PartsNow. ` +
      (config.features.loyaltyDiscounts && markup < config.business.defaultMarkupPercentage
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
  thresholds = {
    trustedDiscountPercentage: config.loyalty.trustedDiscountPercentage,
    partnerDiscountPercentage: config.loyalty.partnerDiscountPercentage,
  }
): string {
  if (!config.features.loyaltyDiscounts) return '';

  const tier = user.loyalty_tier as LoyaltyTier;
  const markup = getMarkupPercentage(tier, thresholds);
  const base = config.business.defaultMarkupPercentage;

  if (markup >= base) {
    if (tier === 'verified') {
      return `\nLoyalty: ${formatLoyaltyTier(tier)} — thanks for being a regular customer.`;
    }
    return '';
  }

  return `\nLoyalty: ${formatLoyaltyTier(tier)} — ${markup}% service fee (${base - markup} pts off).`;
}
