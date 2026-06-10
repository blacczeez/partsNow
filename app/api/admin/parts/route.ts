import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getAdminParts, createPart } from '@/lib/services/admin';
import { createPartSchema } from '@/lib/validators/admin';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;

    const result = await getAdminParts({ page, limit, search, category });

    return NextResponse.json({
      parts: result.parts,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('Admin parts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = createPartSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const part = await createPart(result.data);
    return NextResponse.json(part, { status: 201 });
  } catch (error) {
    console.error('Create part error:', error);
    return NextResponse.json(
      { error: 'Failed to create part' },
      { status: 500 }
    );
  }
}
