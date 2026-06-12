'use client';

import { Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { VehicleFitmentBadge } from '@/components/vehicles/vehicle-fitment-badge';
import { formatCurrency } from '@/lib/utils/format';
import type { CatalogPart } from '@/lib/types/catalog';

interface PartCardProps {
  part: CatalogPart;
  onClick: () => void;
}

export function PartCard({ part, onClick }: PartCardProps) {
  const vehicleText =
    part.compatible_vehicles.length > 0
      ? part.compatible_vehicles
          .slice(0, 2)
          .map((v) => `${v.make} ${v.model}`)
          .join(', ')
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-card border border-slate-200 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        {part.image_url ? (
          <img
            src={part.image_url}
            alt={part.name}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <Package className="h-6 w-6 text-slate-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{part.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="default">{part.category_name}</Badge>
          {part.fitment && part.fitment !== 'no_data' && (
            <VehicleFitmentBadge status={part.fitment} />
          )}
          {part.oem_code && (
            <span className="text-xs text-slate-400">{part.oem_code}</span>
          )}
        </div>
        {vehicleText && (
          <p className="mt-1 truncate text-xs text-slate-500">{vehicleText}</p>
        )}
        {part.weight_kg != null && part.weight_kg > 0 && (
          <p className="mt-1 text-xs text-slate-500">{part.weight_kg} kg</p>
        )}
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {part.average_price ? formatCurrency(part.average_price) : 'Price on request'}
        </p>
      </div>
    </button>
  );
}
