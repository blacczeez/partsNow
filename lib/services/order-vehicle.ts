import type { SupabaseClient } from '@supabase/supabase-js';
import type { Vehicle } from '@/lib/types/database';

export interface OrderVehicleSummary {
  id: string;
  make: string;
  model: string;
  year: number;
  spec: string | null;
  nickname: string | null;
}

export async function fetchOrderVehicle(
  supabase: SupabaseClient,
  vehicleId: string | null | undefined
): Promise<OrderVehicleSummary | null> {
  if (!vehicleId) return null;

  const { data, error } = await supabase
    .from('vehicles')
    .select('id, make, model, year, spec, nickname')
    .eq('id', vehicleId)
    .maybeSingle();

  if (error || !data) return null;
  return data as OrderVehicleSummary;
}

export async function attachVehicleToOrder<T extends { vehicle_id?: string | null }>(
  supabase: SupabaseClient,
  order: T
): Promise<T & { vehicle: OrderVehicleSummary | null }> {
  const vehicle = await fetchOrderVehicle(supabase, order.vehicle_id);
  return { ...order, vehicle };
}

export type { Vehicle };
