import { createClient } from '@/lib/supabase/server';
import { flattenPartRow } from '@/lib/utils/part-category';
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
    parts: (data ?? []).map((row) => flattenPartRow(row as Record<string, unknown>)),
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
