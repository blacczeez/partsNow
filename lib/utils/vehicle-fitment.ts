import type { Part, Vehicle } from '@/lib/types/database';

export type PartFitmentStatus = 'fits' | 'no_match' | 'no_data';

export interface CompatibleVehicleEntry {
  make: string;
  model: string;
  year_start: number;
  year_end: number;
  spec?: string;
}

export function normalizeVehicleText(value: string): string {
  return value.trim().toLowerCase();
}

export function partFitsVehicle(
  compatibleVehicles: CompatibleVehicleEntry[] | null | undefined,
  vehicle: Pick<Vehicle, 'make' | 'model' | 'year' | 'spec'>
): boolean {
  if (!compatibleVehicles?.length) return false;

  const make = normalizeVehicleText(vehicle.make);
  const model = normalizeVehicleText(vehicle.model);
  const spec = vehicle.spec ? normalizeVehicleText(vehicle.spec) : null;

  return compatibleVehicles.some((entry) => {
    if (normalizeVehicleText(entry.make) !== make) return false;
    if (normalizeVehicleText(entry.model) !== model) return false;
    if (vehicle.year < entry.year_start || vehicle.year > entry.year_end) return false;

    if (spec && entry.spec && normalizeVehicleText(entry.spec) !== spec) {
      return false;
    }

    return true;
  });
}

export function getPartFitmentStatus(
  part: Pick<Part, 'compatible_vehicles'>,
  vehicle: Pick<Vehicle, 'make' | 'model' | 'year' | 'spec'> | null | undefined
): PartFitmentStatus {
  if (!vehicle) return 'no_data';
  if (!part.compatible_vehicles?.length) return 'no_data';
  return partFitsVehicle(part.compatible_vehicles, vehicle) ? 'fits' : 'no_match';
}

export function formatVehicleLabel(
  vehicle: Pick<Vehicle, 'year' | 'make' | 'model' | 'nickname' | 'spec'>
): string {
  const base = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  if (vehicle.nickname?.trim()) {
    return `${vehicle.nickname.trim()} (${base})`;
  }
  return base;
}

export function formatVehicleLabelShort(
  vehicle: Pick<Vehicle, 'year' | 'make' | 'model'>
): string {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}
