import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/services/inventory';
import { CATEGORIES } from '@/lib/constants/categories';

export async function GET() {
  try {
    const dbCategories = await getCategories();

    // Merge with static category definitions
    const categories = CATEGORIES.map((cat) => {
      const dbCat = dbCategories.find(
        (c) => c.category.toLowerCase() === cat.slug
      );
      return {
        ...cat,
        count: dbCat?.count ?? 0,
      };
    });

    return NextResponse.json({ categories });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch categories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
