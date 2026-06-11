import type { Part, PartCategory } from '@/lib/types/database';

type CategoryJoin = Pick<PartCategory, 'id' | 'slug' | 'name'>;

export function flattenPartRow(
  row: Record<string, unknown>
): Part {
  const joined = row.part_categories as CategoryJoin | CategoryJoin[] | null | undefined;
  const category = Array.isArray(joined) ? joined[0] : joined;
  const { part_categories: _removed, category: _legacy, ...rest } = row;

  return {
    ...(rest as Omit<Part, 'category_slug' | 'category_name'>),
    category_slug: category?.slug ?? '',
    category_name: category?.name ?? 'Uncategorized',
  };
}
