'use client';

import { useState } from 'react';
import { Package, Minus, Plus, ShoppingCart, Car } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VehicleFitmentBadge } from '@/components/vehicles/vehicle-fitment-badge';
import { formatCurrency } from '@/lib/utils/format';
import type { CatalogPart } from '@/lib/types/catalog';

interface PartDetailSheetProps {
  part: CatalogPart | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (part: CatalogPart, quantity: number) => void;
}

export function PartDetailSheet({
  part,
  isOpen,
  onClose,
  onAddToCart,
}: PartDetailSheetProps) {
  const [quantity, setQuantity] = useState(1);

  if (!part) return null;

  const canAddToCart =
    Boolean(part.average_price) && part.weight_kg != null && part.weight_kg > 0;

  function handleAdd() {
    if (!canAddToCart) return;
    onAddToCart(part!, quantity);
    setQuantity(1);
    onClose();
  }

  const footer = part.average_price ? (
    canAddToCart ? (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Quantity</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-button border border-slate-300 text-slate-600 hover:bg-slate-50"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-base font-medium text-slate-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-button border border-slate-300 text-slate-600 hover:bg-slate-50"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <Button fullWidth size="lg" onClick={handleAdd}>
          <ShoppingCart className="mr-2 h-5 w-5" />
          Add to Cart — {formatCurrency(part.average_price! * quantity)}
        </Button>
      </div>
    ) : (
      <p className="text-center text-sm text-slate-500">
        This part is not available for order yet.
      </p>
    )
  ) : (
    <p className="text-center text-sm text-slate-500">Price on request — contact support to order.</p>
  );

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Part Details"
      footer={footer}
    >
      <div className="space-y-4 pb-4">
        <div className="flex h-36 items-center justify-center rounded-card bg-slate-100 sm:h-40">
          {part.image_url ? (
            <img
              src={part.image_url}
              alt={part.name}
              className="h-full w-full rounded-card object-cover"
            />
          ) : (
            <Package className="h-16 w-16 text-slate-300" />
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900">{part.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="default">{part.category_name}</Badge>
            {part.subcategory && <Badge variant="info">{part.subcategory}</Badge>}
            {part.fitment && part.fitment !== 'no_data' && (
              <VehicleFitmentBadge status={part.fitment} />
            )}
            {part.oem_code && (
              <span className="text-xs text-slate-400">OEM: {part.oem_code}</span>
            )}
          </div>
        </div>

        <p className="text-2xl font-bold text-slate-900">
          {part.average_price ? formatCurrency(part.average_price) : 'Price on request'}
        </p>
        {part.weight_kg != null && part.weight_kg > 0 && (
          <p className="text-sm text-slate-600">{part.weight_kg} kg per unit</p>
        )}

        {part.compatible_vehicles.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Compatible Vehicles</p>
            <div className="max-h-32 space-y-1 overflow-y-auto scrollbar-subtle">
              {part.compatible_vehicles.map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <Car className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    {v.make} {v.model} ({v.year_start}-{v.year_end})
                    {v.spec ? ` - ${v.spec}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
