import { Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

interface DeliveryTierBadgeProps {
  tier?: string | null;
  totalWeightKg?: number | null;
  className?: string;
}

function formatTierLabel(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function DeliveryTierBadge({
  tier,
  totalWeightKg,
  className,
}: DeliveryTierBadgeProps) {
  if (!tier && totalWeightKg == null) return null;

  return (
    <Badge variant="info" className={cn('gap-1', className)}>
      <Scale className="h-3 w-3" />
      {tier ? formatTierLabel(tier) : 'Delivery'}
      {totalWeightKg != null ? ` · ${totalWeightKg} kg` : ''}
    </Badge>
  );
}
