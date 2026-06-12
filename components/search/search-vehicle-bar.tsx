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
        className="flex w-full items-center gap-2 rounded-card border border-slate-200 bg-slate-50 px-3 py-2 text-left"
      >
        <Car className="h-4 w-4 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-slate-700">{vehicleLabel}</p>
          {selectedVehicle && vehicles.length > 1 && (
            <p className="truncate text-xs text-slate-500">
              Fitment badges apply to this car
            </p>
          )}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      <label
        className={cn(
          'flex items-center gap-2 rounded-card border px-3 py-2 text-sm',
          !selectedVehicle
            ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
            : fitMyCar
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-slate-200 bg-white text-slate-700'
        )}
      >
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300"
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
