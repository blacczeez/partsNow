import { Car } from 'lucide-react';
import { formatVehicleLabel } from '@/lib/utils/vehicle-fitment';

interface OrderVehicleSummaryProps {
  vehicle: {
    year: number;
    make: string;
    model: string;
    spec: string | null;
    nickname: string | null;
  };
  className?: string;
}

export function OrderVehicleSummary({ vehicle, className }: OrderVehicleSummaryProps) {
  return (
    <div className={className}>
      <div className="flex items-start gap-2 text-sm text-slate-600">
        <Car className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div>
          <p className="font-medium text-slate-900">{formatVehicleLabel(vehicle)}</p>
          {vehicle.spec && (
            <p className="text-xs text-slate-500">{vehicle.spec} spec</p>
          )}
        </div>
      </div>
    </div>
  );
}
