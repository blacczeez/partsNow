import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import {
  createPartCategory,
  getPartCategories,
} from '@/lib/services/part-categories';
import {
  createPartCategorySchema,
} from '@/lib/validators/admin';

export async function GET() {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const categories = await getPartCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('List categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = createPartCategorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const category = await createPartCategory(result.data, auth.user.id);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create category' },
      { status: 500 }
    );
  }
}
