'use client';

import { Car, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatVehicleLabelShort } from '@/lib/utils/vehicle-fitment';
import { useSelectedVehicle } from '@/lib/contexts/selected-vehicle-context';
import { VehiclePickerSheet } from '@/components/vehicles/vehicle-picker-sheet';
import { useState } from 'react';

export function SearchVehicleBar() {
  const {
    vehicles,
    selectedVehicle,
    selectedVehicleId,
    setSelectedVehicleId,
    fitMyCar,
    setFitMyCar,
    isLoading,
  } = useSelectedVehicle();
  const [isOpen, setIsOpen] = useState(false);

  const vehicleLabel = isLoading
    ? 'Loading vehicles…'
    : selectedVehicle
      ? formatVehicleLabelShort(selectedVehicle)
      : vehicles.length > 1
        ? `Choose from ${vehicles.length} vehicles`
        : vehicles.length === 1
          ? formatVehicleLabelShort(vehicles[0])
          : 'Add a car for fitment hints';

  return (
    <div className="mt-3 space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-[#E4E7E9] bg-white px-3 py-2 text-left"
      >
        <Car className="h-4 w-4 shrink-0 text-[#FF6600]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-[#000]">{vehicleLabel}</p>
          {selectedVehicle && vehicles.length > 1 && (
            <p className="truncate text-xs text-[#737373]">
              Fitment badges apply to this car
            </p>
          )}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      <label
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
          !selectedVehicle
            ? 'cursor-not-allowed border-[#E4E7E9] bg-white text-[#737373]'
            : fitMyCar
              ? 'border-[#FF6600] bg-primary/5 text-[#737373]'
              : 'border-slate-200 bg-white text-[#737373]'
        )}
      >
        <span
          className={cn(
            'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border-2 transition-colors',
            !selectedVehicle
              ? 'border-slate-300 bg-slate-100'
              : fitMyCar
                ? 'border-[#FF6600] bg-[#FF6600]'
                : 'border-slate-300 bg-white'
          )}
        >
          {fitMyCar && (
            <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <input
          type="checkbox"
          className="sr-only"
          checked={fitMyCar}
          disabled={!selectedVehicle}
          onChange={(e) => setFitMyCar(e.target.checked)}
        />
        {selectedVehicle
          ? `Only parts for ${formatVehicleLabelShort(selectedVehicle)}`
          : 'Show parts for my car only'}
      </label>

      <VehiclePickerSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        vehicles={vehicles}
        selectedId={selectedVehicleId}
        isLoading={isLoading}
        allowNone
        title={vehicles.length > 1 ? 'Your vehicles' : 'Your car'}
        onSelect={(vehicle) => setSelectedVehicleId(vehicle?.id)}
      />
    </div>
  );
}
