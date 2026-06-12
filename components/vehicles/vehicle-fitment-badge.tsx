import { Badge } from '@/components/ui/badge';
import type { PartFitmentStatus } from '@/lib/utils/vehicle-fitment';

interface VehicleFitmentBadgeProps {
  status: PartFitmentStatus;
  className?: string;
}

export function VehicleFitmentBadge({ status, className }: VehicleFitmentBadgeProps) {
  if (status === 'fits') {
    return (
      <Badge variant="success" className={className}>
        Fits your car
      </Badge>
    );
  }

  if (status === 'no_match') {
    return (
      <Badge variant="warning" className={className}>
        Check fitment
      </Badge>
    );
  }

  return null;
}
