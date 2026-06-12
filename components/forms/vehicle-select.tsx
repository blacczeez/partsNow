'use client';

import { useState } from 'react';
import { Car, ChevronDown } from 'lucide-react';
import { VehiclePickerSheet } from '@/components/vehicles/vehicle-picker-sheet';
import { cn } from '@/lib/utils/cn';
import { formatVehicleLabelShort } from '@/lib/utils/vehicle-fitment';
import { useSelectedVehicle } from '@/lib/contexts/selected-vehicle-context';
import type { Vehicle } from '@/lib/types/database';

interface VehicleSelectProps {
  selectedId?: string;
  onSelect: (vehicle: Vehicle | null) => void;
  allowNone?: boolean;
  className?: string;
}

export function VehicleSelect({
  selectedId,
  onSelect,
  allowNone = true,
  className,
}: VehicleSelectProps) {
  const { vehicles, isLoading } = useSelectedVehicle();
  const [isOpen, setIsOpen] = useState(false);

  const selected = vehicles.find((v) => v.id === selectedId);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex w-full items-center gap-3 rounded-card border border-slate-200 bg-white px-4 py-3 text-left shadow-sm',
          className
        )}
      >
        <Car className="h-5 w-5 text-slate-400" />
        <span className={cn('min-w-0 flex-1 truncate text-sm', selected ? 'text-slate-900' : 'text-slate-400')}>
          {isLoading
            ? 'Loading vehicles…'
            : selected
              ? formatVehicleLabelShort(selected)
              : vehicles.length > 1
                ? `Select from ${vehicles.length} vehicles`
                : 'Select a vehicle (optional)'}
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
      </button>

      <VehiclePickerSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        vehicles={vehicles}
        selectedId={selectedId}
        isLoading={isLoading}
        allowNone={allowNone}
        title={vehicles.length > 1 ? 'Your vehicles' : 'Select vehicle'}
        onSelect={onSelect}
      />
    </>
  );
}
