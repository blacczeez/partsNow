'use client';

import { Car, Check, Plus, Star } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { formatVehicleLabelShort } from '@/lib/utils/vehicle-fitment';
import type { Vehicle } from '@/lib/types/database';
import Link from 'next/link';

interface VehiclePickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  selectedId?: string;
  onSelect: (vehicle: Vehicle | null) => void;
  isLoading?: boolean;
  allowNone?: boolean;
  title?: string;
}

export function VehiclePickerSheet({
  isOpen,
  onClose,
  vehicles,
  selectedId,
  onSelect,
  isLoading = false,
  allowNone = true,
  title = 'Select vehicle',
}: VehiclePickerSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      {isLoading ? (
        <p className="py-8 text-center text-sm text-slate-400">Loading vehicles…</p>
      ) : vehicles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <Car className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">No vehicles saved yet</p>
          <Link href="/account/vehicles" onClick={onClose}>
            <Button variant="secondary" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add vehicle
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {vehicles.length > 1 && (
            <p className="px-1 text-xs text-slate-500">
              {vehicles.length} saved vehicles — pick one for fitment and checkout
            </p>
          )}

          {allowNone && (
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                onClose();
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-card border px-4 py-3 text-left',
                !selectedId ? 'border-primary bg-primary/5' : 'border-slate-200'
              )}
            >
              <span className="flex-1 text-sm text-slate-500">No vehicle selected</span>
              {!selectedId && <Check className="h-5 w-5 text-primary" />}
            </button>
          )}

          {vehicles.map((vehicle) => (
            <button
              key={vehicle.id}
              type="button"
              onClick={() => {
                onSelect(vehicle);
                onClose();
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-card border px-4 py-3 text-left',
                selectedId === vehicle.id
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200'
              )}
            >
              <Car className="h-5 w-5 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    {formatVehicleLabelShort(vehicle)}
                  </p>
                  {vehicle.is_primary && (
                    <Badge variant="primary" className="gap-0.5">
                      <Star className="h-3 w-3 fill-current" />
                      Primary
                    </Badge>
                  )}
                </div>
                {(vehicle.nickname || vehicle.spec) && (
                  <p className="text-xs text-slate-500">
                    {[vehicle.nickname, vehicle.spec].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              {selectedId === vehicle.id && (
                <Check className="h-5 w-5 shrink-0 text-primary" />
              )}
            </button>
          ))}

          <Link
            href="/account/vehicles"
            className="block py-2 text-center text-sm text-primary hover:underline"
            onClick={onClose}
          >
            Manage vehicles
          </Link>
        </div>
      )}
    </BottomSheet>
  );
}
