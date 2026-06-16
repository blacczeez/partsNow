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
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 flex w-full flex-col overflow-hidden rounded-card border border-slate-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Image area */}
      <div className="relative aspect-square w-full bg-slate-100">
        {part.image_url ? (
          <img
            src={part.image_url}
            alt={part.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-10 w-10 text-slate-300" />
          </div>
        )}
        {part.fitment && part.fitment !== 'no_data' && (
          <div className="absolute left-2 top-2">
            <VehicleFitmentBadge status={part.fitment} />
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-medium text-slate-900">
          {part.name}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="default">{part.category_name}</Badge>
          {part.oem_code && (
            <span className="text-xs text-slate-400">{part.oem_code}</span>
          )}
        </div>
        <p className="mt-auto pt-2 text-sm font-semibold text-slate-900">
          {part.average_price ? formatCurrency(part.average_price) : 'Price on request'}
        </p>
      </div>
    </button>
  );
}
