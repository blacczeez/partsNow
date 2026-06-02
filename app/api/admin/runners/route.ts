import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getAdminRunners } from '@/lib/services/admin';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;

    const result = await getAdminRunners({ page, limit, search });

    return NextResponse.json({
      runners: result.runners,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('Admin runners error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch runners' },
      { status: 500 }
    );
  }
}
