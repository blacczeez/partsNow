import { createClient } from '@/lib/supabase/server';
import type { Part } from '@/lib/types/database';

export async function searchParts(options: {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
}): Promise<{ parts: Part[]; total: number }> {
  const supabase = await createClient();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('parts')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('name')
    .range(offset, offset + limit - 1);

  if (options.q) {
    query = query.textSearch('name', options.q, {
      type: 'websearch',
      config: 'english',
    });
  }

  if (options.category) {
    query = query.ilike('category', options.category);
  }

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);

  return { parts: data || [], total: count || 0 };
}

export async function getCategories(): Promise<
  Array<{ category: string; count: number }>
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('parts')
    .select('category')
    .eq('is_active', true);

  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.category] = (counts[row.category] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export async function getPartById(id: string): Promise<Part | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}
