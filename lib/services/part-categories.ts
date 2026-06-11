import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { auditDetails, writeAuditLog } from '@/lib/services/audit-log';
import { slugifyName } from '@/lib/utils/slug';
import type { PartCategory } from '@/lib/types/database';

const PART_CATEGORY_SELECT =
  'id, slug, name, sort_order, is_active, created_at, updated_at';

export async function getPartCategories(options?: {
  activeOnly?: boolean;
}): Promise<PartCategory[]> {
  const supabase = await createClient();

  let query = supabase
    .from('part_categories')
    .select(PART_CATEGORY_SELECT)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (options?.activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []) as PartCategory[];
}

export async function getPartCategoriesWithCounts(): Promise<
  Array<PartCategory & { part_count: number }>
> {
  // Public catalog endpoint — service role avoids RLS gaps for anonymous browsing.
  const supabase = createServiceClient();

  const [{ data: categories, error: catError }, { data: parts, error: partsError }] =
    await Promise.all([
      supabase
        .from('part_categories')
        .select(PART_CATEGORY_SELECT)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase.from('parts').select('category_id').eq('is_active', true),
    ]);

  if (catError) throw new Error(catError.message);
  if (partsError) throw new Error(partsError.message);

  const counts: Record<string, number> = {};
  for (const row of parts ?? []) {
    const id = row.category_id as string;
    counts[id] = (counts[id] ?? 0) + 1;
  }

  return ((categories ?? []) as PartCategory[]).map((category) => ({
    ...category,
    part_count: counts[category.id] ?? 0,
  }));
}

async function ensureUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    let query = supabase.from('part_categories').select('id').eq('slug', slug);
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    const { data } = await query.maybeSingle();
    if (!data) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function createPartCategory(
  data: { name: string; sort_order?: number; is_active?: boolean },
  adminId?: string
): Promise<PartCategory> {
  const supabase = await createClient();
  const baseSlug = slugifyName(data.name);
  const slug = await ensureUniqueSlug(supabase, baseSlug);

  const { data: category, error } = await supabase
    .from('part_categories')
    .insert({
      name: data.name.trim(),
      slug,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    })
    .select(PART_CATEGORY_SELECT)
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    userId: adminId ?? null,
    action: AUDIT_ACTIONS.PART_CATEGORY_CREATED,
    entityType: 'part_category',
    entityId: category.id,
    newValues: auditDetails(`Category created — ${category.name}`, {
      name: category.name,
      slug: category.slug,
    }),
  });

  return category as PartCategory;
}

export async function updatePartCategory(
  categoryId: string,
  data: { name?: string; sort_order?: number; is_active?: boolean },
  adminId?: string
): Promise<PartCategory> {
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from('part_categories')
    .select(PART_CATEGORY_SELECT)
    .eq('id', categoryId)
    .single();

  if (existingError || !existing) {
    throw new Error('Category not found');
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.sort_order !== undefined) updates.sort_order = data.sort_order;
  if (data.is_active !== undefined) updates.is_active = data.is_active;

  const { data: category, error } = await supabase
    .from('part_categories')
    .update(updates)
    .eq('id', categoryId)
    .select(PART_CATEGORY_SELECT)
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    userId: adminId ?? null,
    action: AUDIT_ACTIONS.PART_CATEGORY_UPDATED,
    entityType: 'part_category',
    entityId: categoryId,
    oldValues: existing as Record<string, unknown>,
    newValues: auditDetails(`Category updated — ${category.name}`, { changes: data }),
  });

  return category as PartCategory;
}

export async function assertActiveCategoryId(categoryId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('part_categories')
    .select('id')
    .eq('id', categoryId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Invalid or inactive category');
}
