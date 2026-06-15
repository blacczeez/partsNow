import { Award } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { formatLoyaltyTier, type LoyaltyPricingThresholds } from '@/lib/utils/loyalty';
import type { LoyaltyTier } from '@/lib/types/database';
import { config } from '@/lib/config';
import { getMarkupPercentage } from '@/lib/utils/pricing';

interface LoyaltyCheckoutBannerProps {
  tier: LoyaltyTier;
  subtotal: number;
  loyaltySavings?: number;
  thresholds?: LoyaltyPricingThresholds;
}

export function LoyaltyCheckoutBanner({
  tier,
  subtotal,
  loyaltySavings = 0,
  thresholds,
}: LoyaltyCheckoutBannerProps) {
  if (!config.features.loyaltyDiscounts) return null;

  const markup = getMarkupPercentage(tier, thresholds);
  const base = config.business.defaultMarkupPercentage;

  return (
    <div className="flex items-start gap-3 rounded-card border border-primary/20 bg-primary/5 p-3">
      <Award className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 text-sm">
        <p className="font-medium text-slate-900">
          {formatLoyaltyTier(tier)} tier
          {markup < base && (
            <span className="font-normal text-slate-600">
              {' '}
              — {markup}% service fee ({base - markup} pts below standard)
            </span>
          )}
        </p>
        {loyaltySavings > 0 && subtotal > 0 && (
          <p className="mt-0.5 text-slate-600">
            You save {formatCurrency(loyaltySavings)} on service fees this order
          </p>
        )}
        {tier === 'verified' && markup >= base && (
          <p className="mt-0.5 text-slate-600">
            Verified status unlocked — keep ordering to reach Trusted for lower fees.
          </p>
        )}
      </div>
    </div>
  );
}
