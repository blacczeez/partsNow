import { Badge } from '@/components/ui/badge';
import { formatLoyaltyTier } from '@/lib/utils/loyalty';
import type { LoyaltyTier } from '@/lib/types/database';

const tierVariants: Record<
  LoyaltyTier,
  'default' | 'primary' | 'success' | 'warning' | 'info'
> = {
  new: 'default',
  verified: 'info',
  trusted: 'primary',
  partner: 'success',
};

interface LoyaltyTierBadgeProps {
  tier: LoyaltyTier;
  className?: string;
}

export function LoyaltyTierBadge({ tier, className }: LoyaltyTierBadgeProps) {
  return (
    <Badge variant={tierVariants[tier]} className={className}>
      {formatLoyaltyTier(tier)}
    </Badge>
  );
}
