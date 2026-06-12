import { createClient } from '@/lib/supabase/server';
import { flattenPartRow } from '@/lib/utils/part-category';
import { getPartFitmentStatus } from '@/lib/utils/vehicle-fitment';
import type { Part, Vehicle } from '@/lib/types/database';
import type { CatalogPart } from '@/lib/types/catalog';

function flattenRpcPartRow(row: Record<string, unknown>): Part {
  const { total_count: _total, category_slug, category_name, ...rest } = row;
  return {
    ...(rest as Omit<Part, 'category_slug' | 'category_name' | 'compatible_vehicles'>),
    category_slug: String(category_slug ?? ''),
    category_name: String(category_name ?? 'Uncategorized'),
    compatible_vehicles:
      (rest.compatible_vehicles as Part['compatible_vehicles']) ?? [],
  };
}

async function loadVehicleForSearch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  vehicleId: string
): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', vehicleId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Vehicle;
}

export async function searchParts(options: {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
  vehicleId?: string;
  fitMyCar?: boolean;
  userId?: string;
}): Promise<{ parts: CatalogPart[]; total: number }> {
  const supabase = await createClient();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const offset = (page - 1) * limit;

  let categoryId: string | undefined;
  if (options.category) {
    const { data: categoryRow } = await supabase
      .from('part_categories')
      .select('id')
      .eq('slug', options.category)
      .eq('is_active', true)
      .maybeSingle();
    if (!categoryRow) {
      return { parts: [], total: 0 };
    }
    categoryId = categoryRow.id;
  }

  let vehicle: Vehicle | null = null;
  if (options.vehicleId && options.userId) {
    vehicle = await loadVehicleForSearch(supabase, options.userId, options.vehicleId);
  }

  const useVehicleRpc = Boolean(options.fitMyCar && vehicle);

  if (useVehicleRpc) {
    const { data, error } = await supabase.rpc('search_catalog_parts', {
      p_q: options.q?.trim() || null,
      p_category_id: categoryId ?? null,
      p_make: vehicle!.make,
      p_model: vehicle!.model,
      p_year: vehicle!.year,
      p_spec: vehicle!.spec,
      p_for_vehicle: true,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Record<string, unknown>[];
    const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;

    return {
      parts: rows.map((row) => {
        const part = flattenRpcPartRow(row);
        return {
          ...part,
          fitment: getPartFitmentStatus(part, vehicle),
        };
      }),
      total,
    };
  }

  let query = supabase
    .from('parts')
    .select('*, part_categories(id, slug, name)', { count: 'exact' })
    .eq('is_active', true)
    .order('name')
    .range(offset, offset + limit - 1);

  if (options.q) {
    query = query.textSearch('name', options.q, {
      type: 'websearch',
      config: 'english',
    });
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);

  return {
    parts: (data ?? []).map((row) => {
      const part = flattenPartRow(row as Record<string, unknown>);
      return {
        ...part,
        fitment: vehicle ? getPartFitmentStatus(part, vehicle) : undefined,
      };
    }),
    total: count || 0,
  };
}

export async function getPartById(partId: string): Promise<Part | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('parts')
    .select('*, part_categories(id, slug, name)')
    .eq('id', partId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return flattenPartRow(data as Record<string, unknown>);
}
